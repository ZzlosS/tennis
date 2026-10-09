import crypto from "crypto";
import RedisClient from "../services/redisClient";

// Lua runs inside Redis without other commands in between, so a check and the writes after it cannot be split.
// The sources live here, as strings, so the compiled app needs no extra files.
export interface Script {
  body: string;
  sha: string;
}

const define = (body: string): Script => ({ body, sha: crypto.createHash("sha1").update(body).digest("hex") });

// Claims and releases the hours of day hashes in one step.
// KEYS: the day hashes, "slots:{court}:YYYY-MM-DD".
// ARGV: nClaims, nReleases, then nClaims triples (key number, hour field, holder), then nReleases triples,
//       then one expiry (unix seconds) per key.
// A claim fails when the hour is held by someone else, and then nothing at all is written: the reply lists
// "key|field|holder" for every hour that is taken. A release only removes an hour that still has that holder.
export const claimSlots = define(`
local nClaims = tonumber(ARGV[1])
local nReleases = tonumber(ARGV[2])
local taken = {}
local pos = 3
for i = 1, nClaims do
  local key = KEYS[tonumber(ARGV[pos])]
  local field = ARGV[pos + 1]
  local current = redis.call('HGET', key, field)
  if current and current ~= ARGV[pos + 2] then
    taken[#taken + 1] = key .. '|' .. field .. '|' .. current
  end
  pos = pos + 3
end
if #taken > 0 then
  return taken
end
pos = 3
for i = 1, nClaims do
  redis.call('HSET', KEYS[tonumber(ARGV[pos])], ARGV[pos + 1], ARGV[pos + 2])
  pos = pos + 3
end
for i = 1, nReleases do
  local key = KEYS[tonumber(ARGV[pos])]
  if redis.call('HGET', key, ARGV[pos + 1]) == ARGV[pos + 2] then
    redis.call('HDEL', key, ARGV[pos + 1])
  end
  pos = pos + 3
end
for i = 1, #KEYS do
  redis.call('EXPIREAT', KEYS[i], tonumber(ARGV[pos]))
  pos = pos + 1
end
return taken
`);

// Takes one open place of a partner request, kept as JSON.
// KEYS[1]: the request's JSON key. ARGV: player id.
// Replies "OK", "FULL", "JOINED" (already in), "OWN" (the creator) or "MISSING".
export const joinRequest = define(`
local raw = redis.call('JSON.GET', KEYS[1], '$')
if not raw then return 'MISSING' end
local doc = cjson.decode(raw)[1]
if doc.deleted then return 'MISSING' end
if not doc.active then return 'FULL' end
if doc.playerId == ARGV[1] then return 'OWN' end
local joined = doc.joinedBy or {}
for _, id in ipairs(joined) do
  if id == ARGV[1] then return 'JOINED' end
end
redis.call('JSON.ARRAPPEND', KEYS[1], '$.joinedBy', cjson.encode(ARGV[1]))
if #joined + 1 >= tonumber(doc.playersNeeded) then
  redis.call('JSON.SET', KEYS[1], '$.active', 'false')
end
return 'OK'
`);

// Gives a place back. KEYS[1]: the request's JSON key. ARGV: player id. Replies "OK", "NOT_JOINED" or "MISSING".
export const leaveRequest = define(`
local raw = redis.call('JSON.GET', KEYS[1], '$')
if not raw then return 'MISSING' end
local doc = cjson.decode(raw)[1]
if doc.deleted then return 'MISSING' end
local kept = {}
local found = false
for _, id in ipairs(doc.joinedBy or {}) do
  if id == ARGV[1] then found = true else kept[#kept + 1] = id end
end
if not found then return 'NOT_JOINED' end
if #kept == 0 then
  redis.call('JSON.SET', KEYS[1], '$.joinedBy', '[]')
else
  redis.call('JSON.SET', KEYS[1], '$.joinedBy', cjson.encode(kept))
end
redis.call('JSON.SET', KEYS[1], '$.active', 'true')
return 'OK'
`);

// Moves a record kept as JSON (a match, a court handover) from one status to another, only if it is still in the
// first one, so two people answering at the same moment cannot both win. KEYS[1]: the record's JSON key. ARGV: from status, to status.
// Replies "OK", "WRONG_STATUS" or "MISSING".
export const moveStatus = define(`
local raw = redis.call('JSON.GET', KEYS[1], '$')
if not raw then return 'MISSING' end
local doc = cjson.decode(raw)[1]
if doc.deleted then return 'MISSING' end
if doc.status ~= ARGV[1] then return 'WRONG_STATUS' end
redis.call('JSON.SET', KEYS[1], '$.status', cjson.encode(ARGV[2]))
return 'OK'
`);

// Runs a script by its hash and falls back to sending the whole text when Redis does not know it yet.
export async function runScript(script: Script, keys: string[], args: (string | number)[]): Promise<unknown> {
  try {
    return await RedisClient.execute("EVALSHA", script.sha, keys.length, ...keys, ...args);
  } catch (error) {
    if (error instanceof Error && error.message.includes("NOSCRIPT")) {
      return await RedisClient.execute("EVAL", script.body, keys.length, ...keys, ...args);
    }
    throw error;
  }
}

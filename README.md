# Tennis API

A REST API for organising tennis: players, rackets, clubs, courts, court bookings, matches, and partner requests (looking for opponents to fill a booking). It is written in TypeScript with Express, stores its data in Redis Stack through [Redis OM](https://github.com/redis/redis-om-node), and generates an OpenAPI spec with [tsoa](https://tsoa-community.github.io/docs/) that is served through Swagger UI.

## Tech stack

- Node.js 22 and TypeScript
- Express 4
- Redis Stack (RediSearch + RedisJSON) via `redis-om` 0.4
- zod for configuration and request validation
- JWT access tokens (`jsonwebtoken`) and bcrypt password hashes
- tsoa for the OpenAPI spec, `swagger-ui-express` for the docs page
- Vitest + Supertest for tests, ESLint and Prettier

## Getting started

### Prerequisites

- Node.js 22+ and npm
- Docker (to run Redis Stack)

### 1. Start Redis Stack

```bash
docker compose up -d redis_stack
```

This starts Redis Stack on port `6379` and RedisInsight on <http://localhost:8001>.

### 2. Configure the environment

```bash
cp example.env .env
```

Set `JWT_SECRET` in `.env` to a random string of at least 32 characters (`openssl rand -hex 32`). The server refuses to start if a value is missing or invalid, and the error names the key.

| Variable | Default | Meaning |
| --- | --- | --- |
| `JWT_SECRET` | none, required | Signs and verifies access tokens. At least 32 characters. |
| `PORT` | `8787` | HTTP port. |
| `REDIS_URL` | `redis://localhost:6379` | Redis Stack connection URL. |
| `JWT_ACCESS_TTL` | `15m` | Access token lifetime. |
| `JWT_REFRESH_TTL_DAYS` | `30` | Refresh token lifetime in days. |
| `BCRYPT_ROUNDS` | `12` | bcrypt cost factor. |
| `CORS_ORIGINS` | empty | Comma-separated web origins allowed to call the API from a browser. Empty means none. |
| `RATE_LIMIT_PER_MINUTE` | `600` | Requests one client may make a minute. |
| `RATE_LIMIT_AUTH_PER_MINUTE` | `20` | Requests per minute and IP to `/v1/auth/*` (login, sign-up, password reset). |
| `TRUST_PROXY` | `0` | Number of proxies in front of the API. Set it behind a load balancer so limits count the client's IP. |
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent`. |
| `APP_URL` | `http://localhost:8081` | Where the app lives; links in emails point here. |
| `RESEND_API_KEY` | empty | Sends email through [Resend](https://resend.com). Without it emails are only written to the log. |
| `MAIL_FROM` | `Tennis <onboarding@resend.dev>` | Sender of emails; use an address on a domain verified in Resend. |
| `EXPO_ACCESS_TOKEN` | empty | Only needed if "enhanced push security" is on in your Expo project. |
| `REMINDER_HOURS_BEFORE` | `2` | How long before a booking starts the player gets a reminder. |

### 3. Install and run

```bash
npm install
npm run watch     # runs src/server.ts with nodemon + ts-node
```

The server listens on <http://localhost:8787>. `GET /health` answers `{ "status": "ok" }` when Redis is reachable.

## npm scripts

| Script | What it does |
| --- | --- |
| `npm run watch` | Run the app from source with nodemon. |
| `npm run dev` | Regenerate the spec and routes, then run nodemon for the app and for tsoa side by side. |
| `npm run spec` | Generate `openapi/v1.json` and `src/generated/routes.ts` from the controllers. Commit the result. |
| `npm run mock` | Serve the sample responses from the spec on <http://localhost:4010> with Prism (no Redis or login needed; routes have no `/v1` prefix there). |
| `npm run seed` | Fill Redis with sample players, clubs, courts and bookings. |
| `npm run build` | Generate the spec, then compile TypeScript to `build/`. |
| `npm start` | Run the compiled app from `build/server.js`. |
| `npm test` | Run the tests (needs Redis Stack, see Testing). |
| `npm run lint` / `npm run typecheck` / `npm run format` | ESLint, `tsc --noEmit`, Prettier. |
| `npm run grant-role -- --email <e> --role <ROLE> [--club <id>]` | Give a player a role (see Roles). |
| `npm run rebuild-stats` | Add up every confirmed match again and replace the stored player stats. |

## API documentation

With the server running, open <http://localhost:8787/docs> for Swagger UI. The OpenAPI spec is committed at `openapi/v1.json` and served at `/openapi/v1.json`; the app generates its client from it. All routes live under `/v1`.

After changing a controller, run `npm run spec` and commit the changed spec. CI fails if the committed spec is out of date, and fails on a breaking change to the spec compared with `main` (checked with oasdiff). A pull request that breaks the contract on purpose needs the `api-breaking` label.

### Conventions

- **Lists** return `{ "items": [...], "nextCursor": "..." | null }`. Pass `limit` (1 to 100, default 20) and the previous `nextCursor` as `cursor`.
- **Money** is `{ "amountMinor": 180000, "currency": "RSD" }`, in minor units. A court with `pricePerHour: null` is free.
- **Times** are ISO 8601 UTC strings (`startsAt`, `endsAt`). Bookings start and end on the hour.
- **Summaries**: other records appear as small objects (`PlayerSummary`, `ClubSummary`, `CourtSummary`) so screens need no extra calls.
- **Errors** have one shape (see Errors).

### Courts with and without a club

A court has a `kind`: `CLUB`, `PUBLIC` (for example a park court) or `PRIVATE` (owned by a person). Any player can add a `PUBLIC` or `PRIVATE` court through `POST /courts` and becomes its owner (`ownerId`). `GET /courts/unassigned` lists courts without a club. The owner or an `ADMIN` can edit or delete it. Handing it to a club needs the club's consent: the owner asks with `POST /courts/{id}/handover` and the club's admins accept or decline with `POST /court-handovers/{id}/accept` or `/decline` (the owner can `/cancel`). `GET /me/court-handovers` lists the requests a player made and those asked of their clubs. `POST /courts/{id}/assign` skips the consent and is for `ADMIN`s only. Club courts are created with `POST /clubs/{clubId}/courts` and use the club's currency. These courts can be booked and can have partner requests like any other.

### Bookings

A court has opening hours and a time zone (a club court follows its club unless it has hours of its own). `GET /courts/{id}/availability?date=YYYY-MM-DD` lists every hour of that local day as `FREE`, `BOOKED`, `BLOCKED` (kept by the club) or `CLOSED`.

- A booking is whole hours, in the future, inside opening hours and at most 90 days ahead. `MONTH` makes four weekly bookings, `SEASON` weekly bookings up to the club's `seasonEndsOn` (12 weeks if not set). Weekly repeats keep the same wall-clock time across daylight saving changes. They share a `seriesId`.
- Two people can never hold the same hour: all the hours of a request are taken or none, and the answer is `409 SLOT_TAKEN` with `fields.slots` listing the hours that clash. This holds under parallel requests (see Redis design below).
- A player can cancel until the club's `cancelCutoffHours` before the start (24 by default) with `POST /bookings/{id}/cancel`; with `?series=true` the later bookings of the series go too. Club admins, the owner of a court without a club and `ADMIN`s can always cancel. Cancelled bookings stay (status `CANCELLED`) and free their hours.
- `GET /me/bookings?when=upcoming|past` is a player's own list. Club admins see a whole day of their club with `GET /clubs/{id}/schedule?date=` (who booked each hour and whether it was marked paid), mark a booking as paid at the club with `POST /bookings/{id}/paid` (a note only, the app takes no payments), and keep hours free with `POST /courts/{id}/blocks`.

### Map

Clubs and courts without a club can have `latitude` and `longitude`. `GET /places?lat=&lng=&radiusKm=` returns the pins around a point, nearest first, with `kind` (`CLUB`, `PUBLIC` or `PRIVATE`), distance and court count; filter with `kind` and `q` (name or city).

### Partner requests

A request is made for a confirmed booking that has not started, optionally for a `level`. `GET /partner-requests` lists the soonest bookings first and takes `level` (that level and requests open to any), `from`, `to` and `doubles`. `POST /{id}/join` and `/leave` are atomic, so the last place goes to exactly one player (`409 REQUEST_FULL`, `ALREADY_JOINED`, `NOT_JOINED`).

### Matches and stats

Scores must be a finished best-of-3 or best-of-5 match (6-0 to 6-4, 7-5, 7-6; a deciding set may be a long set or a match tie-break). A match starts `PENDING`; a player of the other team confirms it (`POST /matches/{id}/confirm`) or disputes it (`/dispute`), and only then does it count. Changing the score asks again. A confirmed match can only be changed or removed by an `ADMIN`. `GET /me/matches`, `GET /me/stats` and `GET /players/{id}/stats` give the list and the totals (wins, losses, sets, games).

## Authentication

1. `POST /auth/register` or `POST /auth/login` returns `{ accessToken, expiresIn, refreshToken, player }`. `expiresIn` is in seconds.
2. Send the access token on every other request: `Authorization: Bearer <accessToken>`.
3. When the access token expires the API answers `401` with code `TOKEN_EXPIRED`. Call `POST /auth/refresh` with `{ refreshToken }` to get a new pair. Each refresh token works once, so store the new one.
4. `POST /auth/logout` with `{ refreshToken }` ends the session.

Wrong password, unknown email and deleted account all give the same `401 INVALID_CREDENTIALS`. `/auth/*` is limited to 20 requests a minute per IP.

**Password reset:** `POST /auth/forgot-password` emails a one-hour link (always `204`, so it does not reveal who has an account) and `POST /auth/reset-password` with `{ token, newPassword }` sets the password and ends every session. **Email check:** sign-up sends a link; `POST /auth/verify-email` confirms it, `POST /me/verify-email` sends it again, and `GET /me` has `emailVerified`. Emails are written in the player's `language` (`en` or `sr`). Sending goes through Resend (set `RESEND_API_KEY`, and `MAIL_FROM` on a domain verified there); without a key the email is only written to the log. The links open `APP_URL/reset-password?token=...` and `APP_URL/verify-email?token=...`.

`GET /me`, `PATCH /me`, `POST /me/password` and `DELETE /me` are the logged-in player's own account. Deleting it cancels future bookings, closes courts the player owns, ends all sessions and frees the email. Emails are unique, case-insensitive, and an email frees up when its account is deleted.

## Roles and who may do what

A player is `PLAYER` by default. The role is read from the access token, so after a role changes the player has to log in again.

| Resource | Read | Create | Edit or delete |
| --- | --- | --- | --- |
| Players | any logged-in user (email only visible to the player and admins) | `/auth/register` | the player or an `ADMIN` |
| Clubs | any logged-in user | `ADMIN` | admins of that club, or `ADMIN` |
| Courts | any logged-in user | club admins in their own club, `ADMIN` anywhere; any player for a court without a club | admins of the court's club, the owner of a court without a club, or `ADMIN` |
| Bookings | own; club admins also see their club's; `ADMIN` all | any user, as themselves | the owner, admins of the court's club, or `ADMIN` |
| Matches | any logged-in user | a player in the match | players in the match, or `ADMIN` |
| Partner requests | any logged-in user | the owner of the booking | the creator or `ADMIN`; you cannot accept your own |
| Rackets | any logged-in user | `ADMIN` (shared catalog) | `ADMIN`; players add rackets from the catalog to their own list |

The acting player always comes from the token, never from the request body. A booking's price is always calculated from the court.

### Creating the first admin

Nobody can promote themselves through the API. Register normally, then on a machine that can reach Redis:

```bash
npm run grant-role -- --email me@example.com --role ADMIN
npm run grant-role -- --email boss@club.com --role CLUB_ADMIN --club <clubId>
```

In the Docker image use `node build/scripts/grantRole.js` with the same arguments.

## Push notifications

The app registers its Expo push token with `POST /me/devices` (on every start) and removes it with `DELETE /me/devices` (on logout). The API sends through [Expo](https://docs.expo.dev/push-notifications/overview/) for: a booking reminder (`REMINDER_HOURS_BEFORE` before the start), a booking cancelled by someone else, someone joining a partner request, a match score to confirm, confirmed or disputed, and court handover requests and answers. Text is in the player's language and every notification carries `data.type` and an id for opening the right screen. Reminders run from a sorted set that the server checks every minute, so run one server process or accept that several share the work safely. Tokens Expo reports as gone are dropped. Building the app needs an Expo account; the API works without one.

## Operations

- **Rate limit:** a Redis counter per client and minute (the token, else the IP). Over the limit the answer is `429 RATE_LIMITED` with `Retry-After`. If Redis fails the request goes through.
- **Logging:** one JSON line per request (method, path without the query string, status, time, request id, player id) through pino. Every response has an `X-Request-Id` header; send your own to trace a call. Passwords, tokens and bodies are never logged.
- **Redis design:** each court has one hash per UTC day (`slots:{courtId}:YYYY-MM-DD`, field = hour, value = who holds it) that a Lua script claims all-or-nothing; the map is a GEO set (`geo:places`); player stats are hashes (`stats:<playerId>`); partner request join/leave, match answers and handover answers are Lua scripts on the stored JSON; reminders are a sorted set; rate limits, reset tokens (stored hashed) and devices are plain keys. No data needs migrating between versions of this release because there was no data before it.

## Errors

Every error has one shape. The app translates by `code`, so the API stays language-neutral:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Validation failed", "fields": { "email": ["Invalid email"] } } }
```

| Code | Status | Meaning |
| --- | --- | --- |
| `VALIDATION_FAILED` | 400 | A body or query value is invalid. `fields` lists each one. |
| `UNAUTHENTICATED` | 401 | Missing, malformed or invalid token. |
| `TOKEN_EXPIRED` | 401 | The access token expired; refresh it. |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password. |
| `FORBIDDEN` | 403 | Logged in, but not allowed to do this. |
| `NOT_FOUND` | 404 | The record does not exist or was deleted. |
| `EMAIL_TAKEN` | 409 | That email is already registered. |
| `CONFLICT` | 409 | The action clashes with the current state. |
| `SLOT_TAKEN` | 409 | An hour is already booked or blocked. `fields.slots` lists them. |
| `OUTSIDE_OPENING_HOURS` | 400 | The court is closed at that time. |
| `COURT_CLOSED` | 409 | The court is closed and cannot be booked. |
| `BOOKING_IN_PAST` | 400 or 409 | The booking or block starts in the past, or the booking has already started. |
| `CANCEL_TOO_LATE` | 409 | Inside the club's cancel cut-off. |
| `REQUEST_FULL` / `ALREADY_JOINED` / `NOT_JOINED` | 409 | A partner request has no place left, you are already in it, or you are not. |
| `MATCH_NOT_PENDING` | 409 | The match is not waiting for an answer, or is confirmed and locked. |
| `HANDOVER_PENDING` | 409 | The court already has a handover waiting for an answer. |
| `TOKEN_INVALID` | 400 | An emailed link has expired or was already used. |
| `RATE_LIMITED` | 429 | Too many requests; wait `Retry-After` seconds. |
| `INTERNAL` | 500 | Unexpected error. Details stay in the server log. |

## Endpoints

| Resource | Routes |
| --- | --- |
| Auth `/v1/auth` | `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `POST /forgot-password`, `POST /reset-password`, `POST /verify-email` |
| Me `/v1/me` | `GET /`, `PATCH /`, `DELETE /`, `POST /password`, `POST /verify-email`, `GET /courts`, `GET /clubs`, `GET /bookings`, `GET /matches`, `GET /stats`, `GET /court-handovers`, `POST /devices`, `DELETE /devices` |
| Places `/v1/places` | `GET /` (around a point) |
| Players `/v1/players` | `GET /`, `GET /{id}`, `GET /{id}/stats`, `PATCH /{id}`, `DELETE /{id}` |
| Player rackets `/v1/players/{playerId}/rackets` | `GET /`, `PUT /{racketId}`, `DELETE /{racketId}` |
| Rackets `/v1/rackets` | `GET /`, `POST /`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}` |
| Clubs `/v1/clubs` | `GET /`, `POST /`, `GET /{id}`, `GET /{id}/schedule`, `PATCH /{id}`, `DELETE /{id}` |
| Club courts `/v1/clubs/{clubId}/courts` | `GET /`, `POST /` |
| Courts `/v1/courts` | `GET /`, `POST /`, `GET /unassigned`, `GET /{id}`, `GET /{id}/availability`, `PATCH /{id}`, `DELETE /{id}`, `POST /{id}/handover`, `POST /{id}/assign` (ADMIN) |
| Court blocks `/v1/courts/{courtId}/blocks` | `GET /`, `POST /`, `DELETE /{blockId}` |
| Court handovers `/v1/court-handovers` | `GET /{id}`, `POST /{id}/accept`, `POST /{id}/decline`, `POST /{id}/cancel` |
| Bookings `/v1/bookings` | `GET /`, `POST /`, `GET /{id}`, `PATCH /{id}`, `POST /{id}/cancel`, `POST /{id}/paid`, `DELETE /{id}/paid`, `DELETE /{id}` |
| Matches `/v1/matches` | `GET /`, `POST /`, `GET /{id}`, `PATCH /{id}`, `POST /{id}/confirm`, `POST /{id}/dispute`, `DELETE /{id}` |
| Partner requests `/v1/partner-requests` | `GET /` (`status`, `level`, `from`, `to`, `doubles`), `POST /`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`, `POST /{id}/join`, `POST /{id}/leave` |

See Swagger UI for request and response bodies. Deleted records are soft-deleted: they disappear from every list and answer `404` by id.

### Enums

- Player level: `NEWBIE`, `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `PRO`
- Role: `PLAYER`, `CLUB_ADMIN`, `ADMIN`
- Racket level: `JUNIOR`, `RECREATIONAL`, `PROFESSIONAL`
- Court surface: `GRASS`, `CLAY`, `HARD`
- Booking type: `ONE_TIME`, `MONTH`, `SEASON`
- Booking status: `PENDING` (while being made), `CONFIRMED`, `CANCELLED`
- Match status: `PENDING`, `CONFIRMED`, `DISPUTED`
- Court kind: `CLUB`, `PUBLIC`, `PRIVATE`
- Slot status: `FREE`, `BOOKED`, `BLOCKED`, `CLOSED`

## Project structure

```
src/
  app.ts          createApp(): middleware, Swagger UI, routers, error handlers
  server.ts       Loads config, connects to Redis, starts listening
  config.ts       Environment variables, validated at startup
  router/         Express routers, one per resource
  controller/     tsoa-decorated controllers with the business logic and access checks
  repositories/   Redis OM repositories (BaseRepository holds the shared logic)
  schemas/        Redis OM schemas
  entities/       Entity types
  validation/     zod schemas for request bodies and queries
  requests/       Request body types
  responses/      Response types
  enums/          Shared enums
  middleware/     JWT authentication, request validation
  services/       Redis connection, tokens, passwords, access checks
  errors/         AppError, error codes and Express error handlers
  redis/          Lua scripts (slot claims, partner request join/leave, status moves)
  scripts/        grantRole.ts, rebuildStats.ts
  examples/       insertData.ts: the sample data
test/             Vitest + Supertest tests
openapi/
  v1.json         Generated OpenAPI spec (committed)
```

## Testing

Tests call the real Express app against a real Redis Stack, with no mocks. Start the throwaway test Redis (port 6380, wiped on restart) and run them:

```bash
docker compose up -d redis_test
npm test
```

Set `REDIS_URL` to point the tests at a different Redis Stack. Every test starts from an empty database, so never point it at data you want to keep. CI runs lint, type check, the tests, the build and a Docker image check on every pull request.

## Docker

```bash
docker compose up --build
```

Starts the API on port `8787` next to Redis Stack. `JWT_SECRET` (and optionally `CORS_ORIGINS`) are read from `.env`. The image is multi-stage, runs as a non-root user and reports health through `/health`.

## Sample data

`npm run seed` runs `src/examples/insertData.ts` on an empty database (it does nothing if clubs exist). It creates two clubs with courts and coordinates, a public and a private court, an `ADMIN` (`admin@example.com`), a club admin (`clubadmin@example.com`), six players (`player1@example.com` to `player6@example.com`), rackets, bookings with partner requests, a weekly booking, a club block, confirmed and pending matches with stats, and a pending court handover. Every password is `password123`.

## Known limitations

- Distances on the map are straight lines, and `GET /places` looks at up to 500 places in the radius.
- Reminders and the rate limiter use Redis only; a Redis outage stops reminders but not the API.
- Images (court and profile photos) are not part of this release.

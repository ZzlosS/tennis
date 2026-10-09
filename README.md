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

A court has a `kind`: `CLUB`, `PUBLIC` (for example a park court) or `PRIVATE` (owned by a person). Any player can add a `PUBLIC` or `PRIVATE` court through `POST /courts` and becomes its owner (`ownerId`). `GET /courts/unassigned` lists courts without a club. The owner or an `ADMIN` can edit, delete or hand the court to a club with `POST /courts/{id}/assign`. Club courts are created with `POST /clubs/{clubId}/courts` and use the club's currency. These courts can be booked and can have partner requests like any other.

## Authentication

1. `POST /auth/register` or `POST /auth/login` returns `{ accessToken, expiresIn, refreshToken, player }`. `expiresIn` is in seconds.
2. Send the access token on every other request: `Authorization: Bearer <accessToken>`.
3. When the access token expires the API answers `401` with code `TOKEN_EXPIRED`. Call `POST /auth/refresh` with `{ refreshToken }` to get a new pair. Each refresh token works once, so store the new one.
4. `POST /auth/logout` with `{ refreshToken }` ends the session.

Wrong password, unknown email and deleted account all give the same `401 INVALID_CREDENTIALS`. Emails are unique, case-insensitive, and an email frees up when its account is deleted.

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
| `CONFLICT` | 409 | The action clashes with the current state, for example a partner request that is already full. |
| `INTERNAL` | 500 | Unexpected error. Details stay in the server log. |

## Endpoints

| Resource | Routes |
| --- | --- |
| Auth `/v1/auth` | `POST /register`, `POST /login`, `POST /refresh`, `POST /logout` |
| Players `/v1/players` | `GET /`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}` |
| Player rackets `/v1/players/{playerId}/rackets` | `GET /`, `PUT /{racketId}`, `DELETE /{racketId}` |
| Rackets `/v1/rackets` | `GET /`, `POST /`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}` |
| Clubs `/v1/clubs` | `GET /`, `POST /`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}` |
| Club courts `/v1/clubs/{clubId}/courts` | `GET /`, `POST /` |
| Courts `/v1/courts` | `GET /`, `POST /`, `GET /unassigned`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`, `POST /{id}/assign` |
| Bookings `/v1/bookings` | `GET /`, `POST /`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}` |
| Matches `/v1/matches` | `GET /`, `POST /`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}` |
| Partner requests `/v1/partner-requests` | `GET /` (`status=OPEN\|CLOSED`), `POST /`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`, `POST /{id}/join` |

See Swagger UI for request and response bodies. Deleted records are soft-deleted: they disappear from every list and answer `404` by id.

### Enums

- Player level: `NEWBIE`, `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `PRO`
- Role: `PLAYER`, `CLUB_ADMIN`, `ADMIN`
- Racket level: `JUNIOR`, `RECREATIONAL`, `PROFESSIONAL`
- Court surface: `GRASS`, `CLAY`, `HARD`
- Booking type: `ONE_TIME`, `MONTH`, `SEASON`

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
  scripts/        grantRole.ts
  examples/       insertData.ts: faker-based helpers to seed sample data
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

`npm run seed` runs `src/examples/insertData.ts`, which creates random players, clubs, courts, rackets, bookings and partner requests with faker.

## Known limitations

- Two people can still book the same court and hour; availability and overlap checks come with the booking features.
- No password reset or email verification yet.
- The API contract (paths, `entityId` naming, pagination) is not final.

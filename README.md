# Tennis API

A REST API for organising tennis: players, rackets, clubs, courts, court bookings, matches, and "enemy requests" (looking for opponents to fill a booking). It is written in TypeScript with Express, stores its data in Redis Stack through [Redis OM](https://github.com/redis/redis-om-node), and generates an OpenAPI spec with [tsoa](https://tsoa-community.github.io/docs/) that is served through Swagger UI.

## Tech stack

- Node.js 18 and TypeScript
- Express 4
- Redis Stack (RediSearch + RedisJSON) via `redis-om`
- tsoa for the OpenAPI spec, `swagger-ui-express` for the docs page
- JWT authentication with `jsonwebtoken`
- `@faker-js/faker` for generating sample data

## Getting started

### Prerequisites

- Node.js 18+ and npm
- Docker (to run Redis Stack)

### 1. Start Redis Stack

```bash
docker compose up -d
```

This starts `redis/redis-stack` with Redis on port `6379` and RedisInsight on <http://localhost:8001>. The app connects to `redis://localhost:6379` (see `src/repositories/baseRepository.ts`).

### 2. Configure the environment

```bash
cp example.env .env
```

Set `TOKEN_KEY` in `.env`. It is the secret used to sign JWTs on login and register.

> **Note:** the auth middleware (`src/middleware/auth.ts`) currently verifies tokens with a hard-coded secret (`lestra`) instead of `TOKEN_KEY`, so set `TOKEN_KEY=lestra` for issued tokens to be accepted by protected routes.

### 3. Install and run

```bash
npm install
npm run watch     # runs src/app.ts with nodemon + ts-node
```

The server listens on <http://localhost:8787>.

## npm scripts

| Script | What it does |
| --- | --- |
| `npm run watch` | Run the app from source with nodemon. |
| `npm run dev` | Regenerate the Swagger spec, then run nodemon for the app and for `tsoa spec` side by side. |
| `npm run swagger` | Generate `public/swagger.json` from the tsoa controller decorators. |
| `npm run build` | Generate the spec, then compile TypeScript to `build/`. |
| `npm start` | Run the compiled app from `build/app.js`. |

## API documentation

With the server running, open <http://localhost:8787/docs> for Swagger UI. The raw spec is at `/swagger.json` (`public/swagger.json` in the repo). Regenerate it with `npm run swagger` after changing controllers.

## Authentication

1. Register with `POST /players/register` or log in with `POST /players/login`. Both return `{ token, email, entityId }`.
2. Send the token on every other request:

   ```
   Authorization: Bearer <token>
   ```

Everything except register and login requires a valid token.

## Endpoints

| Resource | Routes |
| --- | --- |
| Players `/players` | `POST /register`, `POST /login`, `GET /`, `GET /:entityId`, `GET /level/:level`, `GET /city/:city`, `PATCH /:entityId`, `DELETE /:entityId` |
| Rackets `/rackets` | `POST /`, `POST /assign`, `GET /`, `GET /all`, `GET /:entityId`, `PATCH /:entityId`, `DELETE /:entityId` |
| Clubs `/clubs` | `POST /`, `GET /all`, `GET /city/:city`, `GET /:entityId`, `DELETE /:entityId` |
| Courts `/courts` | `POST /`, `POST /assign`, `GET /all`, `GET /unassigned`, `GET /price`, `GET /:entityId`, `PATCH /:entityId`, `DELETE /:entityId` |
| Bookings `/bookings` | `POST /`, `GET /`, `GET /:entityId`, `PATCH /:entityId`, `DELETE /:entityId` |
| Matches `/matches` | `POST /`, `GET /all`, `GET /player/:entityId`, `GET /:entityId`, `PATCH /:entityId`, `DELETE /:entityId` |
| Enemy requests `/requests` | `POST /`, `POST /accept`, `GET /`, `GET /inactive`, `DELETE /:entityId` |
| Health | `GET /` (no auth), `GET /ping` |

See Swagger UI for request and response bodies.

### Enums

- Player level: `NEWBIE`, `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `PRO`
- Racket level: `JUNIOR`, `RECREATIONAL`, `PROFESSIONAL`
- Court surface: `GRASS`, `CLAY`, `HARD`
- Booking type: `ONE_TIME`, `MONTH`, `SEASON`

## Project structure

```
src/
  app.ts          Express app: middleware, Swagger UI, routers, error handlers
  router/         Express routers, one per resource
  controller/     tsoa-decorated controllers with the business logic
  repositories/   Redis OM repositories (BaseRepository holds the connection)
  schemas/        Redis OM schemas
  entities/       Entity types
  requests/       Request body types
  responses/      Response types
  dtos/           Data transfer objects used by repositories
  enums/          Shared enums
  middleware/     JWT authentication
  errors/         AppError and Express error handlers
  services/       Redis client singleton
  examples/       insertData.ts: faker-based helpers to seed sample data
public/
  swagger.json    Generated OpenAPI spec
```

## Sample data

`src/examples/insertData.ts` exports helpers (`insertPlayer`, `insertClub`, `insertCourt`, `insertRacket`, `insertBooking`, `insertRequest`, ...) that create random records with faker. Call the ones you need at the bottom of the file and run it with the "Insert" launch configuration in `.vscode/launch.json`, or:

```bash
npx ts-node src/examples/insertData.ts
```

## Docker

`docker-compose.yml` currently runs only Redis Stack; the `app` service is commented out. The `Dockerfile` expects an `env/` folder and exposes port `4005`, while the app listens on `8787`, so it needs adjusting before it can be used.

## Known limitations

- Passwords are stored and compared in plain text (`bcrypt` is installed but not used yet).
- The JWT verification secret is hard-coded in `src/middleware/auth.ts`.
- The Redis URL and server port are hard-coded rather than read from the environment.
- There are no automated tests yet.

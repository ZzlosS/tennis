import express, { Application, Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { config } from "./config";
import { httpLogger, requestId } from "./logger";
import { rateLimit } from "./middleware/rateLimit";
import healthRouter from "./router/healthRouter";
import { errorLogger, errorResponder, invalidPathHandler } from "./errors/errorHandlers";
import { RegisterRoutes } from "./generated/routes";

// Builds the Express app without starting it, so tests can import it.
export function createApp(): Application {
  const app: Application = express();

  if (config.TRUST_PROXY > 0) {
    app.set("trust proxy", config.TRUST_PROXY);
  }
  app.use(requestId);
  app.use(httpLogger);
  app.use(cors({ origin: config.CORS_ORIGINS }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  // The committed OpenAPI spec (openapi/v1.json), which Swagger UI and the app's generated client read.
  app.use("/openapi", express.static("openapi"));

  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: "/openapi/v1.json",
      },
    })
  );

  app.get("/", async (req: Request, res: Response) => {
    res.send("TS App is Running");
  });

  app.use(healthRouter);
  // Sign-up and login get a tighter limit than the rest of the API, since they are what guessing passwords goes through.
  app.use(
    "/v1/auth",
    rateLimit({ scope: "auth", limit: () => config.RATE_LIMIT_AUTH_PER_MINUTE, keyOf: (req) => `ip:${req.ip}` })
  );
  app.use("/v1", rateLimit({ scope: "api", limit: () => config.RATE_LIMIT_PER_MINUTE }));
  RegisterRoutes(app);

  // Error handlers
  app.use(errorLogger);
  app.use(errorResponder);
  app.use(invalidPathHandler);

  return app;
}

import express, { Application, Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { config } from "./config";
import healthRouter from "./router/healthRouter";
import { errorLogger, errorResponder, invalidPathHandler } from "./errors/errorHandlers";
import { RegisterRoutes } from "./generated/routes";

// Builds the Express app without starting it, so tests can import it.
export function createApp(): Application {
  const app: Application = express();

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
  RegisterRoutes(app);

  // Error handlers
  app.use(errorLogger);
  app.use(errorResponder);
  app.use(invalidPathHandler);

  return app;
}

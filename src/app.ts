import express, { Application, Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { config } from "./config";
import authRouter from "./router/authRouter";
import healthRouter from "./router/healthRouter";
import playerRouter from "./router/playerRouter";
import pingRouter from "./router/pingRouter";
import racketRouter from "./router/racketRouter";
import clubRouter from "./router/clubRouter";
import courtRouter from "./router/courtRouter";
import { errorLogger, errorResponder, invalidPathHandler } from "./errors/errorHandlers";
import bookingRouter from "./router/bookingRouter";
import matchRouter from "./router/matchRouter";
import enemyRequestRouter from "./router/enemyRequestRouter";

// Builds the Express app without starting it, so tests can import it.
export function createApp(): Application {
  const app: Application = express();

  app.use(cors({ origin: config.CORS_ORIGINS }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static("public"));

  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: "/swagger.json",
      },
    })
  );

  app.get("/", async (req: Request, res: Response) => {
    res.send("TS App is Running");
  });

  app.use(healthRouter);
  app.use("/auth", authRouter);
  app.use("/players", playerRouter);
  app.use("/rackets", racketRouter);
  app.use("/clubs", clubRouter);
  app.use("/courts", courtRouter);
  app.use("/bookings", bookingRouter);
  app.use("/matches", matchRouter);
  app.use("/requests", enemyRequestRouter);
  app.use("/", pingRouter);

  // Error handlers
  app.use(errorLogger);
  app.use(errorResponder);
  app.use(invalidPathHandler);

  return app;
}

import express, { Application, Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import bodyParser from "body-parser";
import playerRouter from "./router/playerRouter";
import pingRouter from "./router/pingRouter";
import racketRouter from "./router/racketRouter";
import clubRouter from "./router/clubRouter";
import courtRouter from "./router/courtRouter";
import { errorLogger, errorResponder, invalidPathHandler } from "./errors/errorHandlers";
import bookingRouter from "./router/bookingRouter";
import matchRouter from "./router/matchRouter";
import enemyRequestRouter from "./router/enemyRequestRouter";

require("dotenv").config();

const app: Application = express();
const PORT = 8787;


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json());
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

app.listen(PORT, async () => {
  console.log(`Server is running on PORT ${PORT} 🚀 `);
});


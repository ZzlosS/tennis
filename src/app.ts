import express, { Application, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import playerRouter from "./router/playerRouter";
import pingRouter from "./router/pingRouter";
import { errorLogger, errorResponder, invalidPathHandler, requestLogger } from "./errors/errorHandlers";
import swaggerUi from "swagger-ui-express";
import insert from "./examples/insertData";
import racketRouter from "./router/racketRouter";

require("dotenv").config();

const app: Application = express();
const PORT = 8787;


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(requestLogger);

app.use(express.json());
// app.use(morgan("tiny"));
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
app.use("/", pingRouter);

// Error handlers
app.use(errorLogger);
app.use(errorResponder);
app.use(invalidPathHandler);

app.listen(PORT, async () => {
  console.log(process.env.TOKEN_KEY);
  console.log(`Server is running on PORT ${PORT} 🚀 `);
});

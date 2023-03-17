import express, { Application, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import playerRouter from "./router/playerRouter";
import { errorLogger, errorResponder, invalidPathHandler } from "./errors/errorHandlers";
require("dotenv").config();

const app: Application = express();
const PORT = 8787;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", async (req: Request, res: Response) => {
  res.send("TS App is Running");
});

// app.use("/player", playerRouter);

// Error handlers
app.use(errorLogger);
app.use(errorResponder);
app.use(invalidPathHandler);


app.listen(PORT, () => {
  console.log("Test");
  console.log(`server is running on PORT ${PORT}`);
});

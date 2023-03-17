import express, { Application, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import playerRouter from "./router/playerRouter";
import { errorLogger, errorResponder, invalidPathHandler } from "./errors/errorHandlers";
require("dotenv").config();

const app: Application = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/player", playerRouter);


// Error handlers
app.use(errorLogger);
app.use(errorResponder);
app.use(invalidPathHandler);

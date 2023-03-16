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
// Attach the first Error handling Middleware
// function defined above (which logs the error)
app.use(errorLogger);

// Attach the second Error handling Middleware
// function defined above (which sends back the response)
app.use(errorResponder);

// Attach the fallback Middleware
// function which sends back the response for invalid paths)
app.use(invalidPathHandler);

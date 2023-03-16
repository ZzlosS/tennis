import express, { Application, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import playerRouter from "./router/playerRouter";
require("dotenv").config();

const app: Application = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/player", playerRouter);
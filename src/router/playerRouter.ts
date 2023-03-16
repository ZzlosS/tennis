import express, { Request, Response } from "express";
import PlayerController from "../controller/playerController";

const playerRouter = express.Router();

playerRouter.post("/login", (req: Request, res: Response) => {
  return (new PlayerController()).login(req, res);
});

playerRouter.post("/register", (req: Request, res: Response) => {
  return (new PlayerController()).register(req, res);
});

export default playerRouter;

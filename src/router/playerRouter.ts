import express, { NextFunction, Request, Response } from "express";
import PlayerController from "../controller/playerController";
import PlayerLevel from "../enums/playerLevel";
import { authenticateToken } from "../middleware/auth";

const playerRouter = express.Router();

playerRouter.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const controller = new PlayerController();
    const response = await controller.login(req.body);
    return res.send(response);
  } catch (error) {
    next(error)
  }
});

playerRouter.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const controller = new PlayerController();
    const response = await controller.register(req.body);
    return res.send(response);
  } catch (error) {
    next(error)
  }
});

playerRouter.get("/level/:level", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const controller = new PlayerController();
    const response = await controller.getPlayersByLevel(req.params['level'] as PlayerLevel);
    return res.send(response);
  } catch (error) {
    next(error)
  }
});

playerRouter.get("/city/:city", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const controller = new PlayerController();
    const response = await controller.getPlayersByCity(req.params['city']);
    return res.send(response);
  } catch (error) {
    next(error)
  }
});

playerRouter.delete("/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const controller = new PlayerController();
    const response = await controller.deletePlayer(req.params['entityId']);
    return res.send(response);
  } catch (error) {
    next(error)
  }
});

playerRouter.patch("/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const controller = new PlayerController();
    const response = await controller.updatePlayer(req.body, req.params['entityId']);
    return res.send(response);
  } catch (error) {
    next(error)
  }
});

playerRouter.get("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const controller = new PlayerController();
    const response = await controller.getAll();
    return res.send(response);
  } catch (error) {
    next(error)
  }
});

playerRouter.get("/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const controller = new PlayerController();
    const response = await controller.getByEntityId(req.params['entityId']);
    return res.send(response);
  } catch (error) {
    next(error)
  }
});


export default playerRouter;

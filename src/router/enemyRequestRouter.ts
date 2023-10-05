import express, { Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import CreateEnemyRequest from "../requests/createEnemyRequest";
import EnemyRequestController from "../controller/enemyRequestController";
import AcceptEnemyRequest from "../requests/acceptEnemyRequest";

const enemyRequestRouter = express.Router();

enemyRequestRouter.post("/", authenticateToken, async (req: Request, res: Response) => {
    const controller = new EnemyRequestController();
    const response = await controller.createRequest(req.body as CreateEnemyRequest);
    return res.send(response);
});

enemyRequestRouter.get("/", authenticateToken, async (req: Request, res: Response) => {
    const controller = new EnemyRequestController();
    const response = await controller.getActiveRequests();
    return res.send(response);
});

enemyRequestRouter.get("/inactive", authenticateToken, async (req: Request, res: Response) => {
    const controller = new EnemyRequestController();
    const response = await controller.getInactiveRequests();
    return res.send(response);
});

enemyRequestRouter.post("/accept", authenticateToken, async (req: Request, res: Response) => {
    const controller = new EnemyRequestController();
    const response = await controller.acceptRequest(req.body as AcceptEnemyRequest);
    return res.send(response);
});

export default enemyRequestRouter;
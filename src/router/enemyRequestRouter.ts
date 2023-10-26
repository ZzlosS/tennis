import express, { NextFunction, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import CreateEnemyRequest from "../requests/createEnemyRequest";
import EnemyRequestController from "../controller/enemyRequestController";
import AcceptEnemyRequest from "../requests/acceptEnemyRequest";

const enemyRequestRouter = express.Router();

enemyRequestRouter.post("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new EnemyRequestController();
        const response = await controller.createRequest(req.body as CreateEnemyRequest);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

enemyRequestRouter.get("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new EnemyRequestController();
        const response = await controller.getActiveRequests();
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

enemyRequestRouter.get("/inactive", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new EnemyRequestController();
        const response = await controller.getInactiveRequests();
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

enemyRequestRouter.post("/accept", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new EnemyRequestController();
        const response = await controller.acceptRequest(req.body as AcceptEnemyRequest);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

enemyRequestRouter.delete("/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new EnemyRequestController();
        const response = await controller.deleteEnemyRequest(req.params['entityId']);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

export default enemyRequestRouter;
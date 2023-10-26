import express, { NextFunction, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import RacketController from "../controller/racketController";
import AssignRacketRequest from "../requests/assignRacketRequest";
import CreateRacketRequest from "../requests/createRacketRequest";

const racketRouter = express.Router();

racketRouter.delete("/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new RacketController(req.entityId || '');
        const response = await controller.deleteRacket(req.params['entityId']);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

racketRouter.get("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new RacketController(req.entityId || '');
        const response = await controller.getRackets();
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

racketRouter.get("/all", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new RacketController(req.entityId || '');
        const response = await controller.getAllRackets();
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

racketRouter.post("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new RacketController(req.entityId || '');
        const response = await controller.createRacket(req.body as CreateRacketRequest);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

racketRouter.post("/assign", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new RacketController(req.entityId || '');
        const response = await controller.assignRacketToPlayer(req.body as AssignRacketRequest);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

racketRouter.patch("/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new RacketController(req.entityId || '');
        const response = await controller.updateRacket(req.body, req.params['entityId']);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});


racketRouter.get("/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new RacketController(req.entityId || '');
        const response = await controller.getRacket(req.params['entityId']);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

export default racketRouter;


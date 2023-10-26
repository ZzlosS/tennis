import express, { NextFunction, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import MatchController from "../controller/matchController";
import CreateMatchRequest from "../requests/createMatchRequest";

const matchRouter = express.Router();

matchRouter.post("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new MatchController();
        const response = await controller.createMatch(req.body as CreateMatchRequest);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

matchRouter.get("/all", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new MatchController();
        const response = await controller.getAllMatches();
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

matchRouter.get("/player/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new MatchController();
        const response = await controller.getPlayersMatches(req.params['entityId']);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

matchRouter.get("/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new MatchController();
        const response = await controller.getById(req.params['entityId']);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

matchRouter.delete("/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new MatchController();
        const response = await controller.deleteMatch(req.params['entityId']);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

matchRouter.patch("/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new MatchController();
        const response = await controller.updateMatch(req.body, req.params['entityId']);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

export default matchRouter;
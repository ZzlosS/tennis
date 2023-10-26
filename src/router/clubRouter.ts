import express, { NextFunction, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import ClubsController from "../controller/clubController";
import ClubCreateRequest from "../requests/clubCreateRequest";

const clubRouter = express.Router();

clubRouter.get("/all", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new ClubsController();
        const response = await controller.getAllClubs();
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

clubRouter.post("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new ClubsController();
        const response = await controller.createClub(req.body as ClubCreateRequest);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});


clubRouter.get("/city/:city", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new ClubsController();
        const response = await controller.getClubsByCity(req.params['city']);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

clubRouter.get("/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new ClubsController();
        const response = await controller.getById(req.params['entityId']);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

clubRouter.delete("/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new ClubsController();
        const response = await controller.deleteClub(req.params['entityId']);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

export default clubRouter;
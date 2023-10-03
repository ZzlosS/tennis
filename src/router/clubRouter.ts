import express, { Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import ClubsController from "../controller/clubController";
import ClubCreateRequest from "../requests/clubCreateRequest";

const clubRouter = express.Router();

clubRouter.get("/all", authenticateToken, async (req: Request, res: Response) => {
    const controller = new ClubsController();
    const response = await controller.getAllClubs();
    return res.send(response);
});

clubRouter.post("/", authenticateToken, async (req: Request, res: Response) => {
    const controller = new ClubsController();
    const response = await controller.createClub(req.body as ClubCreateRequest);
    return res.send(response);
});


clubRouter.get("/city/:city", authenticateToken, async (req: Request, res: Response) => {
    const controller = new ClubsController();
    const response = await controller.getClubsByCity(req.params['city']);
    return res.send(response);
});

clubRouter.get("/:entityId", authenticateToken, async (req: Request, res: Response) => {
    const controller = new ClubsController();
    const response = await controller.getById(req.params['entityId']);
    return res.send(response);
});

export default clubRouter;
import express, { Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import RacketController, { AssignRequest, CreateRacketRequest } from "../controller/racketController";

const racketRouter = express.Router();

racketRouter.get("/", authenticateToken, async (req: Request, res: Response) => {
    const controller = new RacketController(req.user_id || '');
    const response = await controller.getRackets();
    return res.send(response);
});

racketRouter.get("/all", authenticateToken, async (req: Request, res: Response) => {
    const controller = new RacketController(req.user_id || '');
    const response = await controller.getAllRackets();
    return res.send(response);
});

racketRouter.post("/", authenticateToken, async (req: Request, res: Response) => {
    const controller = new RacketController(req.user_id || '');
    const response = await controller.createRacket(req.body as CreateRacketRequest );
    return res.send(response);
});

racketRouter.post("/assign", authenticateToken, async (req: Request, res: Response) => {
    const controller = new RacketController(req.user_id || '');
    const response = await controller.assignRacketToPlayer(req.body as AssignRequest );
    return res.send(response);
});

export default racketRouter;

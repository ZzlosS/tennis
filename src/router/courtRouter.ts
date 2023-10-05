import express, { Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import CourtController from "../controller/courtController";
import CourtCreateRequest from "../requests/courtCreateRequest";
import AssignCourtRequest  from "../requests/assignCourtRequest";


const courtRouter = express.Router();

courtRouter.post("/", authenticateToken, async (req: Request, res: Response) => {
    const controller = new CourtController();
    const response = await controller.createCourt(req.body as CourtCreateRequest);
    return res.send(response);
});


courtRouter.get("/price", authenticateToken, async (req: Request, res: Response) => {
    const controller = new CourtController();
    
    const from: number = parseInt(req.query['from'] as string);
    const to: number = parseInt(req.query['to'] as string);

    const response = await controller.findByPrice(from, to);
    
    return res.send(response);
});

courtRouter.post("/assign", authenticateToken, async (req: Request, res: Response) => {
    const controller = new CourtController();
    const response = await controller.assignCourtToClub(req.body as AssignCourtRequest);
    return res.send(response);
});

courtRouter.get("/all", authenticateToken, async (req: Request, res: Response) => {
    const controller = new CourtController();
    const response = await controller.getAllCourts();
    return res.send(response);
});

courtRouter.get("/unassigned", authenticateToken, async (req: Request, res: Response) => {
    const controller = new CourtController();
    const response = await controller.getUnassignedCourts();
    return res.send(response);
});

courtRouter.get("/:entityId", authenticateToken, async (req: Request, res: Response) => {
    const controller = new CourtController();
    const response = await controller.getById(req.params['entityId']);
    return res.send(response);
});


export default courtRouter;

import express, { Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import BookiongController from "../controller/bookingController";
import BookingCreateRequest from "../requests/bookingCreateRequest";

const bookingRouter = express.Router();

bookingRouter.post("/", authenticateToken, async (req: Request, res: Response) => {
    const controller = new BookiongController();
    const response = await controller.createBooking(req.body as BookingCreateRequest);
    return res.send(response);
});

bookingRouter.get("/", authenticateToken, async (req: Request, res: Response) => {
    const controller = new BookiongController();

    const from: number = parseInt(req.query['from'] as string);
    const to: number = parseInt(req.query['to'] as string);
    const player: string = req.query['player'] as string;
    const court: string = req.query['court'] as string;
    const date: string = req.query['date'] as string;

    const response = await controller.filterBookings(court, from, to, player, date);
    return res.send(response);
});


export default bookingRouter;
import express, { NextFunction, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import BookiongController from "../controller/bookingController";
import BookingCreateRequest from "../requests/bookingCreateRequest";

const bookingRouter = express.Router();

bookingRouter.post("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new BookiongController();
        const response = await controller.createBooking(req.body as BookingCreateRequest);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

bookingRouter.get("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new BookiongController();

        const from: number = parseInt(req.query['from'] as string);
        const to: number = parseInt(req.query['to'] as string);
        const player: string = req.query['player'] as string;
        const court: string = req.query['court'] as string;
        const date: string = req.query['date'] as string;

        const response = await controller.filterBookings(court, from, to, player, date);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

bookingRouter.delete("/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new BookiongController();
        const response = await controller.deleteBooking(req.params['entityId']);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

bookingRouter.get("/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new BookiongController();
        const response = await controller.getByEntityId(req.params['entityId']);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

bookingRouter.patch("/:entityId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const controller = new BookiongController();
        const response = await controller.updateBooking(req.body, req.params['entityId']);
        return res.send(response);
    } catch (error) {
        next(error)
    }
});

export default bookingRouter;
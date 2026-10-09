import express, { NextFunction, Request, Response } from "express";
import AuthController from "../controller/authController";
import { validate } from "../middleware/validate";
import { loginBody, refreshBody, registerBody } from "../validation/auth";

const authRouter = express.Router();

authRouter.post(
  "/register",
  validate({ body: registerBody }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await new AuthController().register(req.body);
      return res.status(201).send(response);
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post("/login", validate({ body: loginBody }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await new AuthController().login(req.body);
    return res.send(response);
  } catch (error) {
    next(error);
  }
});

authRouter.post(
  "/refresh",
  validate({ body: refreshBody }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await new AuthController().refresh(req.body);
      return res.send(response);
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post("/logout", validate({ body: refreshBody }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await new AuthController().logout(req.body);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default authRouter;

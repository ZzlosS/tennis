// middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { Player } from '../entities/player';
const jwt = require("jsonwebtoken");

// Define your JWT secret key and token expiration here
const SECRET_KEY = 'lestra';
const EXPIRATION = '1h';

declare global {
    namespace Express {
        interface Request {
            player?: Player
        }
    }
}

export function authenticateToken(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
    return res.status(401).json({ message: 'Authentication failed' });
    }

    jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
        if (err) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        // Attach the authenticated user to the request for further use in routes
        req.player = user;
        next();
    });
}

import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AppError } from './errorHandler';
import dotenv from "dotenv";
dotenv.config();

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; name: string };
    }
  }
}

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Access denied. No token provided', 401, true);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token!,
      process.env.JWT_ACCESS_TOKEN_SECRET as string,
    ) as JwtPayload;

    if (!decoded.userId || !decoded.name) {
      throw new AppError('Invalid token payload', 401, true);
    }

    req.user = {
      userId: decoded.userId as string,
      name: decoded.name as string,
    };

    next();
  } catch (err) {
    throw new AppError('Invalid or expired token', 401, true);
  }
};
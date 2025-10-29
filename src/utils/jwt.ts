import jwt, { JwtPayload } from 'jsonwebtoken';
import { JWTInterface } from '../types/user';
import dotenv from "dotenv";
import { AppError } from '../middlewares/errorHandler';
dotenv.config();

export const generateJWT = (userObj: JWTInterface): string => {
  return jwt.sign(
    { userId: userObj.userId, name: userObj.name },
    process.env.JWT_ACCESS_TOKEN_SECRET as string,
    { expiresIn: '1h' },
  );
};

export const verifyJWT = async (
  token: string,
  secretKey: string,
): Promise<JwtPayload> => {
  try {
    const data = jwt.verify(token, secretKey);

    if (typeof data === 'string') {
      throw new AppError('Invalid token payload', 400, true);
    }

    return data as JwtPayload;
  } catch (error: any) {
    throw new AppError(error.message, 500, true);
  }
};
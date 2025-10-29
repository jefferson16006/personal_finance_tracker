import { Response } from "express";

export const sendSuccess = <T>(
    res: Response,
    message: string,
    data: T,
    token?: string,
    statusCode: number = 200
): void => {
    res.status(statusCode).json({
        success: true,
        message,
        data: data || {},
        token
    })
}

export const sendSuccessNoData = (
    res: Response, 
    message: string, 
    token?: string,
    statusCode: number = 200
): void => {
    res.status(statusCode).json({
        success: true,
        message,
        token
    });
};

export const sendError = (
    res: Response,
    message: string,
    statusCode: number = 500,
    error?: string
): void => {
    res.status(statusCode).json({
        success: false,
        message,
        error: error || message
  });
};
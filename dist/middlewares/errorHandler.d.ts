import type { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    code?: string | undefined;
    details?: any | undefined;
    constructor(message: string, statusCode?: number, isOperational?: boolean, code?: string, details?: any);
}
interface Logger {
    error: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    info: (message: string, meta?: any) => void;
}
interface ErrorHandlerOptions {
    logger?: Logger;
    includeStackTrace?: boolean;
    includeSensitiveData?: boolean;
    customErrorMap?: Map<string, {
        statusCode: number;
        message: string;
    }>;
    onError?: (err: Error, req: Request, res: Response) => void;
}
export declare const errorHandler: (options?: ErrorHandlerOptions) => (err: any, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
export declare const setupProcessHandlers: (logger?: Logger) => void;
export {};
//# sourceMappingURL=errorHandler.d.ts.map
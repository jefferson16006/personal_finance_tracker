"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupProcessHandlers = exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.AppError = void 0;
const crypto_1 = require("crypto");
// Custom error class for application errors
class AppError extends Error {
    statusCode;
    isOperational;
    code;
    details;
    constructor(message, statusCode = 500, isOperational = true, code, details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        this.details = details;
        // Maintains proper stack trace for where error was thrown (Node.js only)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
exports.AppError = AppError;
// Default console logger
const defaultLogger = {
    error: (message, meta) => console.error(message, meta),
    warn: (message, meta) => console.warn(message, meta),
    info: (message, meta) => console.info(message, meta),
};
// Database error handlers
const handleDatabaseErrors = (err) => {
    // MongoDB errors
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((val) => val.message);
        return new AppError(`Validation Error: ${errors.join(', ')}`, 400, true, 'VALIDATION_ERROR', errors);
    }
    if (err.code === 11000 || err.code === 11001) {
        const field = Object.keys(err.keyPattern || err.keyValue)[0];
        return new AppError(`Duplicate field value: ${field}. Please use another value.`, 409, true, 'DUPLICATE_FIELD');
    }
    if (err.name === 'CastError') {
        return new AppError(`Invalid ${err.path}: ${err.value}`, 400, true, 'INVALID_ID');
    }
    // PostgreSQL errors
    if (err.code === '23505') {
        return new AppError('Duplicate field value. Please use another value.', 409, true, 'DUPLICATE_FIELD');
    }
    if (err.code === '23503') {
        return new AppError('Foreign key constraint violation.', 400, true, 'FOREIGN_KEY_VIOLATION');
    }
    if (err.code === '23502') {
        return new AppError('Not null constraint violation.', 400, true, 'NOT_NULL_VIOLATION');
    }
    // Sequelize errors
    if (err.name === 'SequelizeValidationError') {
        const errors = err.errors.map((e) => e.message);
        return new AppError(`Validation Error: ${errors.join(', ')}`, 400, true, 'VALIDATION_ERROR', errors);
    }
    if (err.name === 'SequelizeUniqueConstraintError') {
        return new AppError('Duplicate field value. Please use another value.', 409, true, 'DUPLICATE_FIELD');
    }
    return new AppError('Database operation failed', 500, false, 'DATABASE_ERROR');
};
// JWT error handler
const handleJWTError = (err) => {
    if (err.name === 'JsonWebTokenError') {
        return new AppError('Invalid token. Please log in again.', 401, true, 'INVALID_TOKEN');
    }
    if (err.name === 'TokenExpiredError') {
        return new AppError('Your token has expired. Please log in again.', 401, true, 'TOKEN_EXPIRED');
    }
    return new AppError('Authentication failed', 401, true, 'AUTH_FAILED');
};
// Validation error handler (for libraries like Joi, Yup, etc.)
const handleValidationError = (err) => {
    if (err.name === 'ValidationError' && err.details) {
        // Joi validation error
        const errors = err.details.map((detail) => detail.message);
        return new AppError(`Validation Error: ${errors.join(', ')}`, 400, true, 'VALIDATION_ERROR', errors);
    }
    return new AppError('Validation failed', 400, true, 'VALIDATION_ERROR');
};
// Rate limiting error handler
const handleRateLimitError = (err) => {
    if (err.message && err.message.includes('Too many requests')) {
        return new AppError('Too many requests from this IP, please try again later.', 429, true, 'RATE_LIMIT_EXCEEDED');
    }
    return err;
};
// File upload error handler
const handleMulterError = (err) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return new AppError('File too large. Please upload a smaller file.', 413, true, 'FILE_TOO_LARGE');
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
        return new AppError('Too many files. Please reduce the number of files.', 413, true, 'TOO_MANY_FILES');
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return new AppError('Unexpected file field.', 400, true, 'UNEXPECTED_FILE');
    }
    return new AppError('File upload failed', 400, true, 'FILE_UPLOAD_ERROR');
};
// Main error processing function
const processError = (err, options) => {
    // If it's already an AppError, return as is
    if (err instanceof AppError) {
        return err;
    }
    // Handle specific error types
    if (err.name === 'ValidationError' || (err.name === 'ValidationError' && err.details)) {
        return handleValidationError(err);
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return handleJWTError(err);
    }
    if (err.code && (typeof err.code === 'string' || typeof err.code === 'number')) {
        const dbError = handleDatabaseErrors(err);
        if (dbError instanceof AppError && dbError !== err) {
            return dbError;
        }
    }
    if (err.code && err.code.startsWith('LIMIT_')) {
        return handleMulterError(err);
    }
    if (err.message && err.message.includes('Too many requests')) {
        return handleRateLimitError(err);
    }
    // Handle custom error mappings
    if (options.customErrorMap && err.code && options.customErrorMap.has(err.code)) {
        const mapped = options.customErrorMap.get(err.code);
        return new AppError(mapped.message, mapped.statusCode, true, err.code);
    }
    // Handle common HTTP errors
    if (err.status || err.statusCode) {
        return new AppError(err.message || 'Something went wrong', err.status || err.statusCode, true, err.code);
    }
    // Default to internal server error for unknown errors
    return new AppError('Internal server error', 500, false, 'INTERNAL_ERROR', options.includeSensitiveData ? err.message : undefined);
};
// Generate request ID for tracking
const generateRequestId = () => (0, crypto_1.randomUUID)();
// Main error handler middleware
const errorHandler = (options = {}) => {
    const { logger = defaultLogger, includeStackTrace = process.env.NODE_ENV === 'development', includeSensitiveData = process.env.NODE_ENV === 'development', customErrorMap, onError } = options;
    return (err, req, res, next) => {
        // Generate request ID for tracking
        const requestId = generateRequestId();
        // Process the error
        const processedError = processError(err, options);
        // Log the error
        const logContext = {
            requestId,
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
            userId: req.user?.id || 'anonymous',
            timestamp: new Date().toISOString(),
            stack: err.stack,
            originalError: err.message,
        };
        // Log based on error severity
        if (processedError.statusCode >= 500) {
            logger.error(`${processedError.message}`, logContext);
        }
        else if (processedError.statusCode >= 400) {
            logger.warn(`${processedError.message}`, logContext);
        }
        else {
            logger.info(`${processedError.message}`, logContext);
        }
        // Call custom error handler if provided
        if (onError) {
            try {
                onError(processedError, req, res);
            }
            catch (callbackError) {
                logger.error('Error in custom error handler', { callbackError, requestId });
            }
        }
        // Prepare error response
        const errorResponse = {
            success: false,
            error: {
                message: processedError.message,
                code: processedError.code,
                statusCode: processedError.statusCode,
                timestamp: new Date().toISOString(),
                path: req.path,
                method: req.method,
                requestId,
            }
        };
        // Include additional details in development
        if (includeStackTrace && processedError.stack) {
            errorResponse.error.stack = processedError.stack;
        }
        if (processedError.details) {
            errorResponse.error.details = processedError.details;
        }
        // Set security headers
        res.set({
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
        });
        // Send error response
        res.status(processedError.statusCode).json(errorResponse);
    };
};
exports.errorHandler = errorHandler;
// Async error wrapper utility
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// 404 handler middleware
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404, true, 'ROUTE_NOT_FOUND');
    next(error);
};
exports.notFoundHandler = notFoundHandler;
// Unhandled rejection and exception handlers
const setupProcessHandlers = (logger = defaultLogger) => {
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', { promise, reason });
        // Don't exit in production, let the process continue
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    });
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception thrown:', { error: error.message, stack: error.stack });
        // Exit gracefully
        process.exit(1);
    });
    // Graceful shutdown
    process.on('SIGTERM', () => {
        logger.info('SIGTERM received. Shutting down gracefully...');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        logger.info('SIGINT received. Shutting down gracefully...');
        process.exit(0);
    });
};
exports.setupProcessHandlers = setupProcessHandlers;
//# sourceMappingURL=errorHandler.js.map
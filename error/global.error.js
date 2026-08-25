import { ApiError } from '../error/ApiErrors.error.js';


// GLOBAL ERROR HANDLER
const errorHandler = (err, req, res, next) => {
    // 1. If the error is an instance of our custom ApiError class
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: err.success,
            message: err.message,
            errors: err.errors,
            // Only send stack trace in development mode
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }

    // 2. Fallback for unhandled/native node errors (e.g., syntax errors)
    return res.status(500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
}
export default errorHandler;

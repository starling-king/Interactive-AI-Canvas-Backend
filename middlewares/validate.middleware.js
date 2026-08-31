import { ApiError } from "../error/ApiErrors.error.js";

export const validate = (schema, source = "body") => (req, res, next) => {
    try {
        const result = schema.safeParse(req[source]);

        if (result.success === true) {
            req[source] = result.data;
            return next(); 
        }

        // const errorMessage = result.error.issues[0]?.message || "Invalid input data";

        const errorMessage =
            result.error.issues?.[0]?.message ||
            result.error.errors?.[0]?.message ||
            "Invalid input data";

        return next(new ApiError(400, errorMessage));

    } catch (error) {
        console.error("VALIDATION MIDDLEWARE CRASHED:", error);

        return next(new ApiError(500, "Validation middleware crashed"));
    }
};
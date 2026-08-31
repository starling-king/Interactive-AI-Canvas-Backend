import { ApiError } from "../error/ApiErrors.error.js";

export const validate = (schema, source = "body") => (req, res, next) => {

   
    const result = schema.safeParse(req[source]);

    if (result.success) {
        
        req[source] = result.data;
        return next();
    }

    const errorField = result.error.errors[0]?.path[0];
    const errorMessage = result.error.errors[0]?.message || "Invalid request data";

    throw new ApiError(400, `${errorField ? errorField + ' - ' : ''}${errorMessage}`);
};
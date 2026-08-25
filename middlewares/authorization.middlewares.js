import { ApiError } from "../error/ApiErrors.error.js";
import { asyncHandler } from "../error/asyncHandlers.error.js";

export const authorization = asyncHandler(async(req,res,next)=>{
    try {
        
        next()
    } catch (error) {
        throw new ApiError(401,"unauthorized access")
    }
})
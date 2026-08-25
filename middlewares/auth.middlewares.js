import { ApiError } from "../error/ApiErrors.error.js";
import { asyncHandler } from "../error/asyncHandlers.error.js";
import jwt  from "jsonwebtoken"
import { Admin } from "../models/admin_users.model.js";

export const verifyJwt = asyncHandler(async (req, res, next) => {
    //take token from cookies and remove brearar keyword
    //verify the token is their or not in cookie
    //verify the token using jwt.verify passing token and access token screte
    //create user identity using decode verifiaction 
    //check if the user identity is their or not 
    //make universal identity verifier req.user = user;
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if (!token) {
            throw new ApiError(401, "unauthorized request")
        }

        const decoded = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await Admin.findById(decoded?._id).select("-passwordHash -refreshToken")

        if (!user) {
            throw new ApiError(401, "invalid access token")
        }

        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401,error?.message || "invalid access token")
    }
})
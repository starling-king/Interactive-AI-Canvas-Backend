import { asyncHandler } from "../error/asyncHandlers.error.js"
import { Admin } from "../models/User.model.js"
import { ApiError } from "../error/ApiErrors.error.js"
import { ApiResponse } from "../error/ApiResponse.error.js"
import jwt from "jsonwebtoken"

const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/"
}

const generateAccessAndRefreshTokens = async (user) => {
    try {
        // const user = await Admin.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
}


const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    // validation check - not empty
    // check if user already exits:username,email
    // create user object - create entery in db
    // remove passwordHash and refresh token field from response
    // check for user creation 
    // return response


    // console.log("BODY:", req.body)

    try {
        const { username, email, passwordHash } = req.body


        if (
            [username, email, passwordHash].some(
                (field) => !field || String(field).trim() === ""
            )
        ) {
            throw new ApiError(400, "All fields are required");
        }


        const exitingUser = await Admin.findOne({
            $or: [{ username }, { email }]
        })

        if (exitingUser) {
            throw new ApiError(409, "user email and username already exist")
        }

        if (!/^\d{8}$/.test(passwordHash)) {
            throw new ApiError(400, "Password must be exactly 8 numbers");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            throw new ApiError(400, "Invalid email address format.");
        }

        const admin = await Admin.create({
            username: username.toLowerCase(),
            email,
            passwordHash
        })

        const UserCreated = await Admin.findById(admin._id).select(
            "-passwordHash -refreshToken"
        )

        if (!UserCreated) {
            throw new ApiError(500, "Something went wrong while restering the user")
        }


        return res.status(201).json(
            new ApiResponse(200, UserCreated, "User registered successfully")
        )
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }

})

const loginUser = asyncHandler(async (req, res) => {

    // get username and password form user
    // find the user if not their then tell them to register
    // verify the username or email and hashed password
    // generate access token and refresh token
    // send cookies to user and response of login

    try {
        const { username, email, passwordHash } = req.body

        if (!(username || email)) {
            throw new ApiError(400, "username or password is required")
        }

        const user = await Admin.findOne({
            $or: [{ username }, { email }]
        })

        if (!user) {
            throw new ApiError(404, "user not found please register")
        }

        const isPasswordValid = await user.isPasswordCorrect(passwordHash)

        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid user credentials")
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user)

        // const loggedInUser = await Admin.findById(user._id).select("-passwordHash -refreshToken")

        const loggedInUser = user.toObject();
        delete loggedInUser.passwordHash;
        delete loggedInUser.refreshToken;

        // const options = {
        //     httpOnly: true,
        //     secure: true,
        //     sameSite: "None",
        //     // domain: ".ayushdev.online",
        //     path: "/"
        // }

        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
            new ApiResponse(200, { user: loggedInUser, accessToken }, "userloggedin successfully"))

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }

})


const logoutUser = asyncHandler(async (req, res) => {
    //clear cookies
    //reset refresh token in the database
    try {

        await Admin.findByIdAndUpdate(
            req.user._id,
            {
                $unset: { refreshToken: 1 }
            },
            { new: true }
        )
        // const options = {
        //     httpOnly: true,
        //     secure: true,
        //     sameSite: "None",
        //     // domain: ".ayushdev.online",
        //     path: "/"
        // }
        return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options)
            .json(
                new ApiResponse(200, {}, "user logged out successfully")
            )
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    //decode the refresh token from cookie 
    //validate the refresh token value
    //verify the refresh token using jwt
    //check refresh token decoded one to our databased refresh token
    //generate new access token and refresh token and store refresh in the database
    //send the new access token and refresh token in the cookies to the user

    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incommingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const admin = await Admin.findById(decodedToken?._id)

        if (!admin) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incommingRefreshToken !== admin?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(admin)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken: accessToken },
                    "Access token refresh Successful"
                )
            )
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }


})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    //decript the body
    //find the user id 
    //check the old password
    //hash and save new password in database
    //send success response

    try {
        const { oldpassword, newpassword } = req.body
        const user = await Admin.findById(req.user?.id)
        const isPasswordcorrect = await user.isPasswordCorrect(oldpassword)
        if (!isPasswordcorrect) {
            throw new ApiError(400, "invalid old password")
        }
        user.passwordHash = newpassword;
        await user.save({ validateBeforeSave: false })

        return res.status(200).json(new ApiResponse(200, {}, "password changed successfully"))
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }

})


const getCurrentUser = asyncHandler(async (req, res) => {
    // find current user using middlewhere 
    //select field
    //send the response
    try {
        // const user = await Admin.findById(req.user?._id).select("-passwordHash -refreshToken")
        return res.status(200).json(new ApiResponse(200, req.user, "current user fetched successfully"))
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }
})

const updateAdminDetails = asyncHandler(async (req, res) => {
    //get the parameters
    //using mongo db find and update the things 
    //send the updated information 

    try {
        const { username, email } = req.body
        if (!username || !email) {
            throw new ApiError(400, "All fields are required")
        }
        const admin = await Admin.findByIdAndUpdate(
            req.user?._id,
            {
                $set: { username, email }
            },
            { new: true }
        ).select("-passwordHash -refreshToken")
        return res.status(200).json(new ApiResponse(200, admin, "Details changed successfully"))
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAdminDetails
}


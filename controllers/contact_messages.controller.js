import { asyncHandler } from "../error/asyncHandlers.error.js";
import { ApiError } from "../error/ApiErrors.error.js";
import { ApiResponse } from "../error/ApiResponse.error.js";
import { Message } from "../models/contact_messages.model.js";
import { Admin } from "../models/admin_users.model.js";



//visitor side
const SavetheDataOfForm = asyncHandler(async (req, res) => {
    //Take data form the user form like name,email,message,username
    //verify if it is empty or wrong
    //get admin details by finding admin through username
    //save it into database with the admin id
    //return to the user is readed message and replied message both

    try {
        const { name, email, message } = req.body
        const { username } = req.params

        const targatedAdmin = await Admin.findOne({ username: username })

        if (!targatedAdmin) {
            throw new ApiError(404, "portfolio owner not found")
        }

        if ([name, email, message].some((field) => !field || String(field).trim() === "")) {
            throw new ApiError(400, "All field required")
        }

        if (!email.includes("@")) {
            throw new ApiError(400, "Invalid email");
        }

        // const admin = req.user?._id

        const storing = await Message.create({
            name: name,
            email: email,
            message: message,
            repliedExpectedByAdminId: targatedAdmin._id
        })

        const { repliedAt, isRead } = storing.toObject()

        res.status(201).json(new ApiResponse(201, { repliedAt, isRead }, "your message saved successfully"))

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }
})

const DiscoverMessage = asyncHandler(async (req, res) => {
    //find the sorted data from the message based on admin id 
    //set the isread date
    //send the response to the admin
    try {
        const filtered = await Message.find(
            {
                repliedExpectedByAdminId: req.user?._id,
                isRead: false
            },
        ).select("-isRead -repliedAt").sort({ createdAt: -1 })
    
        if (filtered.length === 0) {
            throw new ApiError(404, "Their is Zero Message")
        }
    
        const messageIds = filtered.map(msg => msg._id);
    
        await Message.updateMany(
            {
                _id: { $in: messageIds }
            },
            {
                $set:
                {
                    isRead: true,
                    repliedAt: new Date()
                }
            }
        )
    
        return res.status(200).json(new ApiResponse(200, {
            updatedStatus:
            {
                filtered, isRead: true,
                repliedAt: new Date()
            }
        }, "message completed successfully"))
    
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }


})


export {
    SavetheDataOfForm,
    DiscoverMessage
}

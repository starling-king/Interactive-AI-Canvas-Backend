import { ApiError } from "../error/ApiErrors.error.js";
import { ApiResponse } from "../error/ApiResponse.error.js"
import { asyncHandler } from "../error/asyncHandlers.error.js";
import { Admin } from "../models/admin_users.model.js";
import { SiteContent } from "../models/site_content.model.js";



const writeContent = asyncHandler(async (req, res) => {
    //deconstruct the sectionKey,contentValue,contentType from body
    //get user id from auth middlewhere using req.user?._id
    //verify the sections is empty or not
    //then find and update the section key content value and content type also user id  in the mongoose database 
    //if not their then create the data 
    //check the data is properly reached or not
    //send the success response and data back again
try {
    
        const { sectionKey, contentValue, contentType } = req.body;
    
        const user = req.user?._id;
    
        if ([sectionKey, contentType, contentValue].some((field) => !field || String(field).trim() === "")) {
            throw new ApiError(400, "All fields are required");
        }
    
        const updating = await SiteContent.findOneAndUpdate(
            {
                sectionKey: sectionKey,
                updatedByAdminId: user
            },
            {
                contentValue: contentValue,
                contentType: contentType
            },
            {
                upsert: true, // Creates the record if not found
                new: true     // Returns the updated document back to you
            }
        );
    
        if (updating === "" || !updating || updating == null) {
            throw new ApiError(500, "server error while creating and updating the content")
        }
    
        return res.status(200).json(new ApiResponse(200, updating, "The content saved successfully"))
    
} catch (error) {
    const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
}
})

const read = asyncHandler(async (req, res) => {
    //get user name from url
    //find the user in the user model if exist get the user id 
    //verify user exist or not
    //fetch all site content for the frontend
    //send it in the response
    try {
        const username = req.params.user
        const exist = await Admin.findOne({ username }).select('_id').lean();
    
        if (!exist) {
            throw new ApiError(400, "user does not exist")
        }
    
        const userid = exist._id
    
    
        const content = await SiteContent.find({ updatedByAdminId: userid }).lean();
    
        return res.status(200).json(new ApiResponse(200,content,"successful"))
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }


})


export {
    writeContent,
    read
}
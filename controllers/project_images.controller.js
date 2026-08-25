import { Image } from "../models/project_images.model.js";
import { asyncHandler } from "../error/asyncHandlers.error.js";
import { ApiError } from "../error/ApiErrors.error.js";
import { ApiResponse } from "../error/ApiResponse.error.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { v2 as cloudinary } from "cloudinary";
import fs from 'fs';
import { Project } from "../models/Project.model.js";
import mongoose from "mongoose";
// import { response } from "express";

const CreateImageCollectionOfProject = asyncHandler(async (req, res) => {
    //read the data from parameters and get project id
    // verify it
    //check images is uploaded or not
    //find the last image if their
    //determint their sort order
    //upload the images on cloudinary and get the url and public id array
    //upload the image url in the mongo db along with project id to identify them

    try {
        const { projectId } = req.params;

        if (!projectId) {
            throw new ApiError(400, "Project ID is required in the URL parameters.");
        }

        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            throw new ApiError(400, "Please upload at least one image.");
        }

        const project = await Project.findOne({
            _id: projectId,
            createdByAdminId: new mongoose.Types.ObjectId(req.user._id)
        });

        if (!project) {
            throw new ApiError(404, "Project not found or unauthorized.");
        }

        
        const currentImageCount = await Image.countDocuments({ projectId: projectId });

        if (currentImageCount + req.files.length > 5) {
            const allowed = 5 - currentImageCount;
            throw new ApiError(400, `Limit exceeded. You can only upload ${allowed} more images.`);
        }

        
        const lastImage = await Image.findOne({ projectId: projectId }).sort({ sortOrder: -1 });

      
        const currentSortOrder = lastImage ? lastImage.sortOrder : 0;


        const uploadPromises = req.files.map(async (file) => {
            try {
                const uploadResult = await uploadOnCloudinary(file.path);


                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                    // fs.unlink(file.path, (err) => {
                    //     if (err) console.error("Temp file deletion failed:", err);
                    // });

                }

                if (!uploadResult || !uploadResult.url || !uploadResult.public_id) {
                    throw new ApiError(500, `Failed to upload file ${file.originalname} to Cloudinary.`);
                }

                return {
                    url: uploadResult.secure_url,
                    publicId: uploadResult.public_id
                };

            } catch (uploadError) {

                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                throw uploadError;
            }
        });


        const imageUrls = await Promise.all(uploadPromises);


        const imageDocuments = imageUrls.map((data, index) => {
            return {
                projectId: projectId,
                imageUrl: data.url,
                publicId: data.publicId,
                altText: req.body.altText || `Project image ${currentSortOrder + index + 1}`,
                sortOrder: currentSortOrder + index + 1,
                userid: req.user._id
            };
        });


        const dataEntry = await Image.insertMany(imageDocuments);


        return res.status(200).json(new ApiResponse(200, dataEntry, `${imageDocuments.length} images uploaded successfully.`));

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }
})

const RemoveImageCollectionOfProject = asyncHandler(async (req, res) => {
    //get project id,and image id from the param also verify
    //using find one find the public id of the image also verify
    //using cloudinary.uploader.destroy give the public id and delete the image from cloudinary
    //after deleting from cloudinary delete that data from database
    try {
        const { projectId, imageId } = req.params;

        if (!projectId || projectId.trim() == "") {
            throw new ApiError(400, "please enter the project id")
        }

        if (!imageId || imageId.trim() == "") {
            throw new ApiError(400, "please enter the image id")
        }

        const PublicIdOfimage = await Image.findOne({ _id: imageId, projectId: projectId })

        if (!PublicIdOfimage) {
            throw new ApiError(400, "does not get this specific image")
        }

        const destroyer = await cloudinary.uploader.destroy(PublicIdOfimage.publicId)

        if (destroyer.result !== "ok" && destroyer.result !== "not found") {
            throw new ApiError(500, "Failed to delete image from Cloudinary.");
        }
        await Image.findByIdAndDelete(imageId);
        res.status(200).json(new ApiResponse(200, {}, "successfully delete the image"))

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );

    }
})




export {
    CreateImageCollectionOfProject,
    RemoveImageCollectionOfProject
}
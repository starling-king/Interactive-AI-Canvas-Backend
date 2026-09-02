import { ApiError } from "../error/ApiErrors.error.js";
import { ApiResponse } from "../error/ApiResponse.error.js";
import { asyncHandler } from "../error/asyncHandlers.error.js";
import slugify from "slugify"
import mongoose from "mongoose";
import { Workspace } from "../models/Workspace.model.js";



const createWorkspace = asyncHandler(async (req, res) => {

    try {

        const { title, description, diagramType, published } = req.body;

        const slug = slugify(title, {
            lower: true,
            strict: true,
            trim: true
        });

        const createWorkspace = await Workspace.create({
            userId: req.user._id, 
            title,
            slug,
            description,
            diagramType,
            isPublished: published || false
        })

        return res.status(200).json(new ApiResponse(200, createWorkspace, "The project created successfully"))
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }

})

const getAllAdminWorkspaces = asyncHandler(async (req, res) => {
    //find the data using adminid and verify
    //return the response
    try {

        // const projectdata = await Workspace.find({ createdByAdminId: req.user?._id })

        // const matchConditions = {
        //     createdByAdminId: new mongoose.Types.ObjectId(req.user._id)
        // }

        // const projectdata = await Workspace.aggregate(buildWorkspacePipeline(matchConditions))

        const workspaces = await Workspace.find({ userId: req.user._id }).sort({ createdAt: -1 });

        if (workspaces.length === 0) {
            return res.status(200).json(new ApiResponse(200, [], "No workspaces found"));
        }

        return res.status(200).json(new ApiResponse(200, workspaces, "The data fetched successfully"))

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }

})

const updateWorkspace = asyncHandler(async (req, res) => {

    try {
        const workspaceId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
            throw new ApiError(400, "Invalid workspace ID");
        }

        const existingWorkspace = await Workspace.findOne({
            _id: workspaceId,
            userId: req.user?._id
        });

        if (!existingWorkspace) {
            throw new ApiError(404, "Workspace not found or unauthorized");
        }

        const updatePayload = {
            ...req.body
        };

        if (req.body.title && req.body.title !== existingWorkspace.title) {
            updatePayload.slug = slugify(req.body.title, { lower: true, strict: true, trim: true });
        }

        const finalWorkspace = await Workspace.findByIdAndUpdate(
            workspaceId,
            updatePayload,
            { new: true }
        );

        return res.status(200).json(new ApiResponse(200, finalWorkspace, "Workspace updated successfully"));

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }

})

const deleteWorkspace = asyncHandler(async (req, res) => {

    try {
        const projectId = req.params.id;

        if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
            throw new ApiError(400, "please enter the project id in url")
        }

        const workspace = await Workspace.findOneAndDelete({
            _id: projectId,
            userId: req.user._id
        });

        if (!workspace) {
            throw new ApiError(404, "Workspace not found or unauthorized");
        }

        // TODO: In Phase 2, we will add the cascading logic here to delete the associated CanvasGraphs and GraphVersions!
     
        return res.status(200).json(new ApiResponse(200, null, "the project delete successfully"))

    } catch (error) {
       const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }

})


export {
    createWorkspace,
    getAllAdminWorkspaces,
    updateWorkspace,
    deleteWorkspace,
}
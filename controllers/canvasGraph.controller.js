import { asyncHandler } from "../error/asyncHandlers.error.js";
import { ApiError } from "../error/ApiErrors.error.js"
import { ApiResponse } from "../error/ApiResponse.error.js";
import { CanvasGraph } from "../models/CanvasGraph.model.js";
import { Workspace } from "../models/Workspace.model.js";
import mongoose from "mongoose";

const getCanvasGraphByWorkspaceId = asyncHandler(async (req, res) => {
    try {
        
        const { workspaceId } = req.params;

        const result = await Workspace.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(workspaceId),
                    userId: new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $lookup: {
                    from: "canvasgraphs",
                    localField: "_id",
                    foreignField: "workspaceId",
                    as: "canvasData"
                }
            },
            {
                $unwind: {
                    path: "$canvasData",
                    preserveNullAndEmptyArrays: true 
                }
            }
        ]);

        if (!result || result.length === 0) {
            throw new ApiError(404, "Workspace not found or unauthorized access");
        }

        return res.status(200).json(
            new ApiResponse(200, result[0], "Canvas graph fetched successfully")
        );

    } catch (error) {
        
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );

    }
})

const SaveCanvasGraph = asyncHandler(async (req, res) => {
    try {
        
        const { workspaceId } = req.params;
        const { nodesData, edgesData, viewport, globalMetrics } = req.body;

        const workspace = await Workspace.findOne({
            _id: workspaceId,
            userId: req.user._id
        }).select("_id");

        if (!workspace) {
            throw new ApiError(403, "Unauthorized: You do not own this workspace");
        }

        const updatedCanvas = await CanvasGraph.findOneAndUpdate(
            { workspaceId: workspace._id },
            {
                $set: {
                    nodesData: nodesData || [],
                    edgesData: edgesData || [],
                    viewport: viewport || { x: 0, y: 0, zoom: 1 },
                    globalMetrics: globalMetrics || {}
                }
            },
            {
                upsert: true, // Create if it doesn't exist
                new: true     // Return the newly updated document
            }
        );

        return res.status(200).json(
            new ApiResponse(200, updatedCanvas, "Canvas state saved successfully")
        );

    } catch (error) {
        
        const statusCode = error.statusCode || 500;
                return res.status(statusCode).json(
                    new ApiResponse(statusCode, null, error.message || "Internal Server Error")
                );

    }
})

export {
    getCanvasGraphByWorkspaceId,
    SaveCanvasGraph
}
import { asyncHandler } from "../error/asyncHandlers.error.js";
import { ApiError } from "../error/ApiErrors.error.js"
import { ApiResponse } from "../error/ApiResponse.error.js";
import { GraphVersion } from "../models/GraphVersion.model.js";
import { Workspace } from "../models/Workspace.model.js";
import { CanvasGraph } from "../models/CanvasGraph.model.js"
// import mongoose from "mongoose";

const createVersionSnapshot = asyncHandler(async (req, res) => {
    try {

        const { workspaceId } = req.params;
        const { changeSummary } = req.body;

        const [workspace, liveCanvas, lastVersion] = await Promise.all([
            Workspace.findOne({ _id: workspaceId, userId: req.user._id }).select("_id"),
            CanvasGraph.findOne({ workspaceId: workspaceId }),
            GraphVersion.findOne({ workspaceId: workspaceId })
                .sort({ versionNumber: -1 })
                .select("versionNumber")
        ]);

        if (!workspace) {
            throw new ApiError(403, "Unauthorized: You do not own this workspace");
        }

        if (!liveCanvas) {
            throw new ApiError(404, "No active canvas found to save a version of");
        }


        const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

        const newVersion = await GraphVersion.create({
            workspaceId: workspace._id,
            versionNumber: nextVersionNumber,
            changeSummary: changeSummary,
            stateSnapshot: {
                nodesData: liveCanvas.nodesData,
                edgesData: liveCanvas.edgesData,
                viewport: liveCanvas.viewport,
                globalMetrics: liveCanvas.globalMetrics
            },
            createdBy: req.user._id
        });

        return res.status(201).json(
            new ApiResponse(201, newVersion, `Version ${nextVersionNumber} saved successfully`)
        );

    } catch (error) {

        if (error.code === 11000) {
            return res.status(409).json(
                new ApiResponse(409, null, "A version is currently being saved. Please wait a moment.")
            );
        }

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );

    }
})

const getWorkspaceVersionHistory = asyncHandler(async (req, res) => {
    try {

        const { workspaceId } = req.params;

        const workspace = await Workspace.findOne({
            _id: workspaceId,
            userId: req.user._id
        }).select("_id");

        if (!workspace) {
            throw new ApiError(403, "Unauthorized access to workspace history");
        }

        const historyLog = await GraphVersion.find({ workspaceId: workspace._id })
            .sort({ versionNumber: -1 })
            .select("-stateSnapshot -diffTree");

        return res.status(200).json(
            new ApiResponse(200, historyLog, "Version history fetched successfully")
        );

    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );

    }
})

const getSingleVersionPreview = asyncHandler(async (req, res) => {
    try {

        const { versionId } = req.params;


        const versionData = await GraphVersion.findById(versionId);

        if (!versionData) {
            throw new ApiError(404, "Version not found");
        }

        const workspace = await Workspace.findOne({
            _id: versionData.workspaceId,
            userId: req.user._id
        }).select("_id");

        if (!workspace) {
            throw new ApiError(403, "Unauthorized: You do not own this workspace history");
        }

        return res.status(200).json(
            new ApiResponse(200, versionData, "Version preview loaded successfully")
        );

    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );

    }
})

const restoreVersion = asyncHandler(async (req, res) => {
    try {

        const { versionId } = req.params;

        const targetVersion = await GraphVersion.findById(versionId);


        if (!targetVersion) {
            throw new ApiError(404, "Version not found");
        }

        const [workspace, lastVersion] = await Promise.all([
            Workspace.findOne({
                _id: targetVersion.workspaceId,
                userId: req.user._id
            }).select("_id"),
            GraphVersion.findOne({ workspaceId: targetVersion.workspaceId })
                .sort({ versionNumber: -1 })
                .select("versionNumber")
        ]);

        // const workspace = await Workspace.findOne({
        //     _id: targetVersion.workspaceId,
        //     userId: req.user._id
        // }).select("_id");


        if (!workspace) {
            throw new ApiError(403, "Unauthorized: You do not own this workspace");
        }

        const { nodesData, edgesData, viewport, globalMetrics } = targetVersion.stateSnapshot;

        const restoredCanvas = await CanvasGraph.findOneAndUpdate(
            { workspaceId: workspace._id },
            {
                $set: {
                    nodesData: nodesData || [],
                    edgesData: edgesData || [],
                    viewport: viewport || { x: 0, y: 0, zoom: 1 },
                    globalMetrics: globalMetrics || {}
                }
            },
            { returnDocument: "after" }
        );

        // const lastVersion = await GraphVersion.findOne({ workspaceId: workspace._id })
        //     .sort({ versionNumber: -1 })
        //     .select("versionNumber");

        const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

        await GraphVersion.create({
            workspaceId: workspace._id,
            versionNumber: nextVersionNumber,
            changeSummary: `Restored back to Version ${targetVersion.versionNumber}`,
            stateSnapshot: targetVersion.stateSnapshot,
            createdBy: req.user._id
        });

        return res.status(200).json(
            new ApiResponse(200, restoredCanvas, `Successfully restored canvas to Version ${targetVersion.versionNumber}`)
        );

    } catch (error) {

        if (error.code === 11000) {
            return res.status(409).json(
                new ApiResponse(409, null, "Canvas is already being restored. Please wait.")
            );
        }

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );

    }
})

export {
    createVersionSnapshot,
    getWorkspaceVersionHistory,
    getSingleVersionPreview,
    restoreVersion,
}
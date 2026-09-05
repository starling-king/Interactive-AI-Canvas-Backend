import { asyncHandler } from "../error/asyncHandlers.error.js";
import { ApiError } from "../error/ApiErrors.error.js"
import { ApiResponse } from "../error/ApiResponse.error.js";
import { AiOrchestration } from "../models/AiOrchestration.model.js";
import { Workspace } from "../models/Workspace.model.js";
import { aiPromptQueue } from "../services/aiQueue.service.js";
// import mongoose from "mongoose";

const submitAiPrompt = asyncHandler(async (req, res) => {
    try {

        const { workspaceId } = req.params;
        const { inputType, rawInput, promptPayload } = req.body;

        const workspace = await Workspace.findOne({
            _id: workspaceId,
            userId: req.user._id
        }).select("_id");

        if (!workspace) {
            throw new ApiError(403, "Unauthorized: You do not own this workspace");
        }

        const orchestrationDoc = await AiOrchestration.create({
            workspaceId: workspace._id,
            bullmqJobId: "pending",
            inputType: inputType,
            rawInput: rawInput,
            promptPayload: promptPayload,
            status: 'queued'
        });

        const job = await aiPromptQueue.add("generate-canvas-graph", {
            orchestrationId: orchestrationDoc._id,
            inputType: inputType,
            rawInput: rawInput,
            promptPayload: promptPayload
        }, {
            attempts: 3,
            backoff: {
                type: 'fixed',
                delay: 2000
            }
        });

        orchestrationDoc.bullmqJobId = job.id;
        await orchestrationDoc.save();

        return res.status(202).json(
            new ApiResponse(202, orchestrationDoc, "AI Prompt received and queued for processing")
        );

    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );

    }
})

const pollAiJobStatus = asyncHandler(async (req, res) => {
    try {
        const { orchestrationId } = req.params;

        const orchestrationDoc = await AiOrchestration.findById(orchestrationId);

        if (!orchestrationDoc) {
            throw new ApiError(404, "AI Job ticket not found");
        }

        const workspace = await Workspace.findOne({
            _id: orchestrationDoc.workspaceId,
            userId: req.user._id
        }).select("_id");

        if (!workspace) {
            throw new ApiError(403, "Unauthorized: You do not own this workspace job");
        }

        if (orchestrationDoc.status === 'queued' || orchestrationDoc.status === 'processing') {

            return res.status(202).json(
                new ApiResponse(202, { status: orchestrationDoc.status }, "AI is still processing your request...")
            );
        }

        if (orchestrationDoc.status === 'failed') {

            return res.status(500).json(
                new ApiResponse(500, { status: 'failed', error: orchestrationDoc.errorMessage }, "AI Processing Failed")
            );
        }

        return res.status(200).json(
            new ApiResponse(200, orchestrationDoc, "AI Processing Complete!")
        );

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }
});



export {
    submitAiPrompt,
    pollAiJobStatus,
}
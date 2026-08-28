import mongoose from "mongoose";

const AiOrchestrationSchema = new mongoose.Schema({

    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace",
        required: true
    },

    bullmqJobId: {
        type: String,
        required: true
    },

    inputType: {
        type: String,
        required: true,
        enum: ['structuredForm', 'rawCode']
    },

    rawInput: {
        type: String,
        required: true
    },


    promptPayload: {
        type: String,
        required: true
    },

    responsePayload: {
        type: mongoose.Schema.Types.Mixed,
    },

    status: {
        type: String,
        enum: ['queued', 'processing', 'completed', 'failed'],
        default: 'queued'
    },

    errorMessage: {
        type: String,
    },

}, { timestamps: true })

AiOrchestrationSchema.index({ status: 1 });

export const AiOrchestration = mongoose.model('AiOrchestration', AiOrchestrationSchema)
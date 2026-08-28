import mongoose from "mongoose";

const GraphVersionSchema = new mongoose.Schema(
    {
        workspaceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
        },

        versionNumber: {
            type: Number,
            required: true,
        },

        changeSummary: {
            type: String,
            required: true
        },

        stateSnapshot: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },

        diffTree: {
            type: mongoose.Schema.Types.Mixed
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: true
        }
    }, { timestamps: true });

GraphVersionSchema.index({ workspaceId: 1, versionNumber: -1 });

export const GraphVersion = mongoose.model("GraphVersion", GraphVersionSchema);

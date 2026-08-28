import mongoose from "mongoose";


const CanvasGraphSchema = new mongoose.Schema({

    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace",
        required: true,
        unique: true
    },

    nodesData: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },

    edgesData: {
        type: [mongoose.Schema.Types.Mixed],
        default: []

    },

    globalMetrics: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    viewport: {
        type: mongoose.Schema.Types.Mixed,
        default: { x: 0, y: 0, zoom: 1 }
    },

}, { timestamps: true })

CanvasGraphSchema.index({ workspaceId: 1 });

export const CanvasGraph = mongoose.model("CanvasGraph", CanvasGraphSchema)
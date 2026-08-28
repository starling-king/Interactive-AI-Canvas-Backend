import mongoose from "mongoose";

const WorkspaceSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required:true,
    },

    title: {
        type: String,
        required:true,
        trim: true
    },

    slug: {
        type: String,
        unique: true,
        required:true
    },

    description: {
        type:String
    },

    diagramType: {
        type: String,
        enum: ['flowchart', 'simulationTree', 'trackingGauge', 'codeLogic'],
        required:true
    },

    isPublished: {
        type: Boolean,
        default:false
    }

}, { timestamps: true })

WorkspaceSchema.index({ userId: 1 });

export const Workspace = mongoose.model("Workspace",WorkspaceSchema)
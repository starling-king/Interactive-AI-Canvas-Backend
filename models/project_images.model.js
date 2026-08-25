import mongoose from "mongoose";
const imageSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true

    },
    imageUrl: {
        type: String,
        required: true,
    },
    publicId: {
        type: String,
        required: true,
    },
    altText: {
        type: String
    },
    sortOrder: {
        type: Number,
        required: true
    },
    userid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        required: true
    }
}, { timestamps: true })
imageSchema.index({ projectId: 1, sortOrder: 1 })
export const Image = mongoose.model("Image", imageSchema)



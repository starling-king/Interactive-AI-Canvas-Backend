import mongoose from "mongoose";

const ResumeAiSchema = new mongoose.Schema({

    title:{
        type: String,
        required: true,
    },

    targetKeywords:{
        type: [String],
    },

    customLinks:{
        type: Map,
    },

    generatedContent:{
        type: String,
        required: true,
    },

    userid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        required: true,
        index: true
    }

},{timestamps:true});



export const ResumeAi = mongoose.model("ResumeAi",ResumeAiSchema);
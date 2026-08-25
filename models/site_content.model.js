import mongoose from "mongoose";
const siteContentSchema = new mongoose.Schema({
    sectionKey:{
        type:String,
        required:true,
        // unique:true
    },
    contentValue:{
        type:String,
        required:true
    },
    contentType:{
        type:String,
        required:true
    },
    updatedByAdminId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Admin",
        required:true
    }
},{timestamps:true})

siteContentSchema.index({ sectionKey: 1, updatedByAdminId: 1 }, { unique: true });

export const SiteContent = mongoose.model("SiteContent",siteContentSchema)


import mongoose from "mongoose";
const messageSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        lowercase:true
    },
    message:{
        type:String,
        required:true
    },
    repliedAt:{
        type:Date,
        default:null
    },
    isRead:{
        type:Boolean,
        default:false
    },
    repliedExpectedByAdminId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Admin"
    }
}, { timestamps: true })

messageSchema.index({ repliedExpectedByAdminId: 1, isRead: 1, createdAt: -1 });

export const Message = mongoose.model("Message",messageSchema)
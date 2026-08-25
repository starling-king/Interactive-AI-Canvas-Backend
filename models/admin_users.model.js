import mongoose from "mongoose";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

//creating modle
const adminSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true
    },
    passwordHash:{
        type:String,
        required:true 
    },
    refreshToken:{
        type:String
    }

},{timestamps:true})

//bcrypt the password
adminSchema.pre("save", async function () {
    if (!this.isModified("passwordHash")) return;

    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
});

//comparing the hash password with user password
adminSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.passwordHash)
}

//valadating the env is their or not
function validateEnv() {
    const required = [
        "ACCESS_TOKEN_SECRET",
        "REFRESH_TOKEN_SECRET",
        "ACCESS_TOKEN_EXPIRY",
        "REFRESH_TOKEN_EXPIRY"
    ];

    required.forEach((key) => {
        if (!process.env[key]) {
            throw new Error(`${key} is missing`);
        }
    });
}
validateEnv();

//generating access token using jwt
adminSchema.methods.generateAccessToken = function(){
    return jwt.sign({
        _id:this._id,
        email:this.email,
        username:this.username
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
)
}

//generating the refresh token using jwt
adminSchema.methods.generateRefreshToken = function(){

    return jwt.sign(
        {_id:this._id},
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

//exporting the schema to mongoose modls
export const Admin = mongoose.model("Admin",adminSchema)




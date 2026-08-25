import {v2 as cloudinary} from "cloudinary";
import fs from "fs";


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) =>{
    //take local file path and verify
    //upload the image on cloudinary
    //send the response
    //if error come remove the temperory file
    try {
        if(!localFilePath){ return console.error("File not found!")}
        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //file has been uploaded successfully
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)  //remove the locally saved temperory file if upload failed
        return null;
    }
}



export {uploadOnCloudinary}
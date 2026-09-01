import { ApiError } from "../error/ApiErrors.error.js";
import { ApiResponse } from "../error/ApiResponse.error.js";
import { asyncHandler } from "../error/asyncHandlers.error.js";
import slugify from "slugify"
import { Project } from "../models/Project.model.js";
import mongoose from "mongoose";
import { Admin } from "../models/admin_users.model.js";
import { buildProjectPipeline } from "../utils/aggrigation-builder.js";
import { v2 as cloudinary } from "cloudinary";
import { Image } from "../models/project_images.model.js"



const createProject = asyncHandler(async (req, res) => {
    //destructure the body of the form or the body 
    //verify everything
    //slugify using title
    //get the user id using req.user?._id
    //create project in database and store it

    try {

        const { title, category, description, problem, approach, solution, result, techStack, githubLink, liveLink, isFeatured, isPublished } = req.body

        const featured = JSON.parse(isFeatured || "false");
        const published = JSON.parse(isPublished || "false");

        // console.log(featured,published)

        if ([title, category, description].some(field => !field || field === "")) {
            throw new ApiError(400, "title category and discription are required field minimum")
        }


        if (featured && !published) {
            throw new ApiError(400, "this is required to have featured project also published")
        }

        if (published == true) {
            const requiredForPublish = [problem, approach, solution, result, techStack, liveLink];


            const isIncomplete = requiredForPublish.some(field =>
                !field || (Array.isArray(field) && field.length === 0) || field === "");

            if (isIncomplete) {
                throw new ApiError(
                    400,
                    "Cannot publish an incomplete draft. Please fill out problem, approach, solution, result, and tech stack,liveLink to publish. Otherwise, set isPublished to false to save as a draft."
                );
            }
        }

        const slug = slugify(title, {
            lower: true,
            strict: true,
            trim: true
        });

        const createProject = await Project.create({
            title: title,
            category: category,
            description: description,
            problem: problem,
            approach: approach,
            solution: solution,
            result: result,
            techStack: techStack,
            githubLink: githubLink,
            liveLink: liveLink,
            isFeatured: featured,
            isPublished: published,
            slug: slug,
            createdByAdminId: req.user?._id
        })

        return res.status(200).json(new ApiResponse(200, createProject, "The project created successfully"))
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }

})

const getAllAdminProjects = asyncHandler(async (req, res) => {
    //find the data using adminid and verify
    //return the response
    try {

        // const projectdata = await Project.find({ createdByAdminId: req.user?._id })
        const matchConditions = {
            createdByAdminId: new mongoose.Types.ObjectId(req.user._id)
        }

        const projectdata = await Project.aggregate(buildProjectPipeline(matchConditions))

        if (projectdata.length === 0) {
            throw new ApiError(404, "their is no project")
        }

        return res.status(200).json(new ApiResponse(200, projectdata, "The data fetched successfully"))
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }

})

const getAdminProjectByID = asyncHandler(async (req, res) => {
    //destructure the slugname
    //verify 
    //find data using slug
    //send the response

    try {
        const Iddata = req.params.id

        if (!Iddata || !mongoose.Types.ObjectId.isValid(Iddata)) {
            throw new ApiError(400, "please enter the valid project id in url")
        }

        // const proData = await Project.findOne({ _id: Iddata, createdByAdminId: req.user?._id })

        const matchConditions = {
            createdByAdminId: new mongoose.Types.ObjectId(req.user._id),
            _id: new mongoose.Types.ObjectId(Iddata)
        }

        const projectdata = await Project.aggregate(buildProjectPipeline(matchConditions))

        if (projectdata.length === 0) {
            throw new ApiError(404, "their is no project")
        }


        return res.status(200).json(new ApiResponse(200, projectdata[0], "Successful"))
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }

})

const updateProject = asyncHandler(async (req, res) => {
    //get the project id
    //fetch the existing project
    //validate existing project
    //make a fetched existing data into object
    //check the which field is updated by mearging the things using ... feature of js
    //check atleast title,cateogary and discription is present
    //check if featured then it must be published
    //check if data is published then also other fields will be also their
    //if title is changed then rerun the slug and store it
    //check for fake id and data hack 
    //prevent the mongoose error by stop editing the id 
    //find and update the data in database
    //send the response
    try {
        const projectId = req.params.id;

        const existingProject = await Project.findOne({
            _id: projectId,
            createdByAdminId: req.user?._id
        });

        if (!existingProject) {
            throw new ApiError(404, "Project not found or unauthorized");
        }

        const oldData = existingProject.toObject();

        const updatedData = {
            ...oldData,
            ...req.body
        };

        updatedData.isFeatured = req.body.isFeatured !== undefined ? JSON.parse(req.body.isFeatured) : oldData.isFeatured;
        updatedData.isPublished = req.body.isPublished !== undefined ? JSON.parse(req.body.isPublished) : oldData.isPublished;


        if ([updatedData.title, updatedData.category, updatedData.description].some(field => !field || field === "")) {
            throw new ApiError(400, "Title, category, and description are required minimum fields");
        }

        if (updatedData.isFeatured && !updatedData.isPublished) {
            throw new ApiError(400, "A featured project must also be published");
        }

        if (updatedData.isPublished === true) {
            const requiredForPublish = [
                updatedData.problem,
                updatedData.approach,
                updatedData.solution,
                updatedData.result,
                updatedData.techStack,
                updatedData.liveLink
            ];

            const isIncomplete = requiredForPublish.some(field =>
                !field || (Array.isArray(field) && field.length === 0) || field === ""
            );

            if (isIncomplete) {
                throw new ApiError(
                    400,
                    "Cannot publish an incomplete draft. Please fill out problem, approach, solution, result, tech stack, and liveLink."
                );
            }
        }

        let finalSlug = existingProject.slug;
        if (req.body.title && req.body.title !== existingProject.title) {
            finalSlug = slugify(updatedData.title, { lower: true, strict: true, trim: true });
        }

        const finalUpdatePayload = {
            ...updatedData,
            slug: finalSlug,
            createdByAdminId: req.user?._id
        };
        delete finalUpdatePayload._id;

        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            finalUpdatePayload,
            { new: true }
        );

        return res.status(200).json(new ApiResponse(200, updatedProject, "Project updated successfully"));

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }

})

const deleteProject = asyncHandler(async (req, res) => {
    //get the id from url
    //validate
    //find the images using the data model
    //validate and delete using image public id on cloudinary first using promise all
    //delete the image from database and also delete the project too
    //send response

    try {
        const projectId = req.params.id;

        if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
            throw new ApiError(400, "please enter the project id in url")
        }

        const project = await Project.findOne({ _id: projectId, createdByAdminId: req.user._id });

        if (!project) {
            throw new ApiError(404, "Project not found or unauthorized to delete");
        }

        const imagevalue = await Image.find({ projectId: projectId })

        if (imagevalue.length > 0) {
            const destroyPromises = imagevalue.map((img) => {
                return cloudinary.uploader.destroy(img.publicId);
            });

            await Promise.all(destroyPromises);
        }

            await Image.deleteMany({ projectId: projectId })
            await Project.findByIdAndDelete(projectId);
        
        return res.status(200).json(new ApiResponse(200, null, "the project delete successfully"))

    } catch (error) {
       const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }

})

//public endpoints

const getPublicProjects = asyncHandler(async (req, res) => {
    //destructure the admin username
    //get admin id form database
    //find all projects related to admin id and published is ture and sort top based on featured = true
    //send the response of the data 
    try {
        const { username } = req.params
        const { featured, cateogary } = req.query

        const admin = await Admin.findOne({ username: username }).select('_id').lean();

        if (!admin) {
            throw new ApiError(404, "User not found")
        }

        // const query = {
        //     createdByAdminId: admin._id,
        //     isPublished: true
        // }


        const query = {
            createdByAdminId: new mongoose.Types.ObjectId(admin._id),
            isPublished: true
        }


        if (featured === "true") {
            query.isFeatured = true;
        } else if (featured === "false") {
            query.isFeatured = false;
        }

        if (cateogary) {
            query.category = cateogary;
        }

        // const datavalue = await Project.find(query).sort({ isFeatured: -1, createdAt: -1 })

        const pipeline = buildProjectPipeline(query)

        pipeline.push({
            $sort: {
                isFeatured: -1,
                createdAt: -1
            }
        });

        const datavalue = await Project.aggregate(pipeline);

        return res.status(200).json(new ApiResponse(200, datavalue, "success to fetch data"))

    } catch (error) {
       const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }
})

const getProjectBySlug = asyncHandler(async (req, res) => {
    try {
        //get the username and the slug project name
        //verify them
        //find them 
        //verify if exist
        //return the response

        const { username, slug } = req.params

        if (!username || !slug) {
            throw new ApiError(400, "Please provide both the username and project name in the URL");
        }
        const admin = await Admin.findOne({ username: username }).select('_id').lean();

        if (!admin) {
            throw new ApiError(404, "User not found");
        }

        // const datavalueofslug = await Project.findOne({ createdByAdminId: adminid._id, slug: slug, isPublished: true })

        const matchConditions = {
            createdByAdminId: new mongoose.Types.ObjectId(admin._id),
            slug: slug,
            isPublished: true
        }

        const datavalueofslug = await Project.aggregate(buildProjectPipeline(matchConditions))

        if (datavalueofslug.length === 0) {
            throw new ApiError(404, "project not found or not published")
        }

        return res.status(200).json(new ApiResponse(200, datavalueofslug[0], "successful fetch the project from slug"))

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }
})

export {
    createProject,
    getAllAdminProjects,
    getAdminProjectByID,
    updateProject,
    deleteProject,
    getPublicProjects,
    getProjectBySlug
}
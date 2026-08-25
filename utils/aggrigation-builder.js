// import { asyncHandler } from "../error/asyncHandlers.error"

const buildProjectPipeline = (matchConditions) => {
    return [
        {
            $match: matchConditions 
        },
        {
            $lookup: {
                from: "images",
                localField: "_id",
                foreignField: "projectId",
                as: "image" 
            }
        },
        {
            $project: {
                __v: 0,
                "image.__v": 0,
                "image.projectId": 0,
                "image.createdAt": 0,
                "image.updatedAt": 0
            }
        }
    ];
};

export{ buildProjectPipeline }
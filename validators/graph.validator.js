import { z } from "zod";
import mongoose from "mongoose";

// 1. Validator for routes that take /:workspaceId in the URL
export const workspaceIdVersionParamSchema = z.object({
    workspaceId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid workspace ID format in URL",
    }),
});

// 2. Validator for routes that take /:versionId in the URL (Preview & Restore)
export const versionIdParamSchema = z.object({
    versionId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid version ID format in URL",
    }),
});

// 3. Validator for the POST body when creating a new version
export const createVersionSchema = z.object({
    changeSummary: z.string({
        required_error: "A change summary is required",
        invalid_type_error: "Change summary must be a string"
    })
        .trim()
        .min(3, "Change summary must be at least 3 characters long")
        .max(100, "Change summary cannot exceed 100 characters")
});
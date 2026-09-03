import { z } from "zod";
import mongoose from "mongoose";

// 1. Define the base rules (Reusable)
const titleRule = z
    .string({ required_error: "Title is required" })
    .trim()
    .min(3, { message: "Title must be at least 3 characters long" })
    .max(100, { message: "Title cannot exceed 100 characters" });

const descriptionRule = z
    .string()
    .trim()
    .optional(); // Optional by default, enforced conditionally below

const diagramTypeRule = z
    .enum(['flowchart', 'simulationTree', 'trackingGauge', 'codeLogic'], {
        required_error: "Diagram type is required",
        invalid_type_error: "Invalid diagram type selected"
    });

const isPublishedRule = z
    .preprocess((val) => {
        if (typeof val === "string") {
            if (val.toLowerCase() === "true") return true;
            if (val.toLowerCase() === "false") return false;
        }
        return val;
    }, z.boolean({ invalid_type_error: "isPublished must be a boolean (true/false)" }))
    .optional()
    .default(false);

// 2. The Create Schema
export const createWorkspaceSchema = z.object({
    title: titleRule,
    description: descriptionRule,
    diagramType: diagramTypeRule,
    isPublished: isPublishedRule,
})
//     .refine((data) => {
//     // THE BUSINESS RULE: If isPublished is true, description MUST exist
//     if (data.isPublished === true) {
//         return data.description && data.description.trim().length > 0;
//     }
//     return true; // Pass validation if not published
// }, {
//     message: "Cannot publish an incomplete draft. Please fill out the description.",
//     path: ["description"], // Tells the frontend exactly which field caused the error
// });

// 3. The Update Schema
export const updateWorkspaceSchema = z.object({
    title: titleRule.optional(),
    description: descriptionRule,
    diagramType: diagramTypeRule.optional(),
    isPublished: isPublishedRule,
})
//     .refine((data) => {
//     // If they are trying to publish during an update, they cannot send an empty description
//     if (data.isPublished === true && data.description !== undefined) {
//         return data.description.trim().length > 0;
//     }
//     return true;
// }, {
//     message: "Description cannot be empty when publishing.",
//     path: ["description"],
// });

export const workspaceIdParamSchema = z.object({
    id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid workspace ID format in URL",
    }),
});

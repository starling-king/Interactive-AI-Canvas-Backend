import { z } from "zod";
import mongoose from "mongoose";

// 1. Validates the Workspace ID in the URL (for submitting a prompt)
export const orchestrationWorkspaceParamSchema = z.object({
    workspaceId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid workspace ID format",
    }),
});

// 2. Validates the Orchestration ID in the URL (for polling status)
export const pollJobParamSchema = z.object({
    orchestrationId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid AI Job ticket ID format",
    }),
});

// 3. Validates the actual Prompt payload (The Cashier's Order Form)
export const submitAiPromptSchema = z.object({
    inputType: z.enum(["structuredForm", "rawCode"], {
        required_error: "Input type is required",
        invalid_type_error: "Input type must be either 'structuredForm' or 'rawCode'",
    }),

    rawInput: z.string({
        required_error: "Raw input data is required",
    })
        .trim()
        .min(2, "Raw input must be at least 2 characters")
        .max(5000, "Raw input is too long. Please keep it under 5000 characters to prevent token limits."),

    promptPayload: z.string({
        required_error: "Prompt payload constraints are required",
    })
        .trim()
        .min(2, "Prompt constraints must be at least 2 characters")
        .max(2000, "Prompt constraints are too long.")
});
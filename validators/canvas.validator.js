import { z } from "zod";
import mongoose from "mongoose";

export const workspaceIdParamSchema = z.object({
    workspaceId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid workspace ID format in URL",
    }),
});

const nodeSchema = z.object({
    id: z.string({ required_error: "Node ID is required" }),
    type: z.string().optional(), 
    position: z.object({
        x: z.number(),
        y: z.number()
    }),
    data: z.record(z.any()).optional()
}).passthrough(); 


const edgeSchema = z.object({
    id: z.string({ required_error: "Edge ID is required" }),
    source: z.string({ required_error: "Source node ID is required" }),
    target: z.string({ required_error: "Target node ID is required" }),
}).passthrough();


export const saveCanvasGraphSchema = z.object({
    
    nodesData: z.array(nodeSchema).optional().default([]),


    edgesData: z.array(edgeSchema).optional().default([]),

    
    viewport: z.object({
        x: z.number(),
        y: z.number(),
        zoom: z.number()
    }).optional(),


    globalMetrics: z.record(z.any()).optional().default({})
});
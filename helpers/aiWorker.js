import { Worker } from "bullmq";
import IORedis from "ioredis";
import { GoogleGenAI } from "@google/genai";
import { AiOrchestration } from "../models/AiOrchestration.model.js";

const redisConnection = new IORedis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null,
});

const ai = new GoogleGenAI({});

export const aiPromptWorker = new Worker("ai-prompt-queue", async (job) => {
    const { orchestrationId, rawInput, promptPayload } = job.data;

    console.log(`[WORKER] Picked up job ${orchestrationId}. Cooking...`);

    try {

        await AiOrchestration.findByIdAndUpdate(orchestrationId, { status: 'processing' });

        // const response = await ai.models.generateContent({
        //     model: "gemini-2.5-flash",
        //     contents: `You are an expert architecture engine. Convert the following input into a strict JSON payload containing nodesData and edgesData. \n\nInput: ${rawInput}\n\nConstraints: ${promptPayload}`,
        //     config: {
                
        //         responseMimeType: "application/json",
        //     }
        // });

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: `
                You are an expert React Flow architecture engine. 
                Convert the following input into a strict, valid JSON payload.
                The JSON MUST contain exactly two arrays: "nodesData" and "edgesData".
                
                CRITICAL NODE RULES:
                1. Every node MUST have 'id', 'position' (x,y), 'data' objects, and a 'type' property.
                2. You MUST assign specific 'type' values based on the node's function (e.g., use 'input' for start points, 'decisionGate' for conditional logic, 'processCard' for actions/math, and 'output' for endpoints).
                
                CRITICAL EDGE RULES:
                React Flow edges require 'id', 'source', and 'target'.
                
                User Input: ${rawInput}
                User Constraints: ${promptPayload}
            `,
            config: {
                responseMimeType: "application/json",
                temperature: 0.2,
            }
        });

        // const response = await ai.models.generateContent({
        //     model: "gemini-3.6-flash",
        //     contents: `
        //         You are an expert React Flow architecture engine. 
        //         Convert the following input into a strict, valid JSON payload.
        //         The JSON MUST contain exactly two arrays: "nodesData" and "edgesData".
        //         React Flow nodes require 'id', 'position' (x,y), and 'data' objects.
        //         React Flow edges require 'id', 'source', and 'target'.
                
        //         User Input: ${rawInput}
        //         User Constraints: ${promptPayload}
        //     `,
        //     config: {
        //         responseMimeType: "application/json",
        //         temperature: 0.2, 
        //     }
        // });
        
        const generatedJsonString = response.text;
        const parsedJson = JSON.parse(generatedJsonString);

       
        await AiOrchestration.findByIdAndUpdate(orchestrationId, {
            status: 'completed',
            responsePayload: parsedJson,
            errorMessage: ""
        });

        console.log(`[WORKER] SUCCESS: AI Job ${orchestrationId} completed.`);

    } catch (error) {
       
        console.error(`[WORKER] ERROR: AI Job ${orchestrationId} failed:`, error.message);

        throw error;
        // await AiOrchestration.findByIdAndUpdate(orchestrationId, {
        //     status: 'failed',
        //     errorMessage: error.message
        // });
    }

   

}, { connection: redisConnection });


aiPromptWorker.on("completed", (job) => console.log(`Job ${job.id} removed from queue.`));

// aiPromptWorker.on("failed", (job, err) => console.log(`Job ${job.id} failed with ${err.message}`));

aiPromptWorker.on("failed", async (job, err) => {
    console.log(`Job ${job.id} permanently failed after retries: ${err.message}`);
    if (job.data && job.data.orchestrationId) {
        await AiOrchestration.findByIdAndUpdate(job.data.orchestrationId, {
            status: 'failed',
            errorMessage: err.message
        });
    }
});
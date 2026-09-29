

// // import { Worker } from "bullmq";
// // import IORedis from "ioredis";
// // import { GoogleGenAI } from "@google/genai";
// // import { AiOrchestration } from "../models/AiOrchestration.model.js";
// // import connectDB from "../data/connect.js";
// // import { MASTER_RULEBOOK, BLUEPRINT_PROMPT } from "./promptRulebook.helper.js"

// // const redisConnection = process.env.REDIS_URL
// //     ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
// //     : new IORedis({ host: "127.0.0.1", port: 6379, maxRetriesPerRequest: null });

// // const ai = new GoogleGenAI({});

// // connectDB();

// // // Helper function to pause execution (Exponential Backoff)
// // const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// // export const aiPromptWorker = new Worker("ai-prompt-queue", async (job) => {
// //     // 1. We extract 'cachedBlueprint' from the job state. On try #1, this is undefined.
// //     const { orchestrationId, rawInput, promptPayload, cachedBlueprint } = job.data;

// //     console.log(`[WORKER] Picked up job ${orchestrationId} (Attempt ${job.attemptsMade + 1}). Executing Pipeline...`);

// //     try {
// //         await AiOrchestration.findByIdAndUpdate(orchestrationId, { status: 'processing' });

// //         let architecturalBlueprint = cachedBlueprint;

// //         // ==========================================
// //         // STEP 1: THE THINKER (Logic & Blueprinting)
// //         // ==========================================
// //         // INDUSTRY STANDARD: Skip Phase 1 entirely if we already have it in Redis memory from a previous crashed attempt.
// //         if (!architecturalBlueprint) {
// //             console.log(`[WORKER] Phase 1: Drafting Conceptual Blueprint...`);

// //             const blueprintResponse = await ai.models.generateContent({
// //                 model: "gemini-3.5-flash-lite",
// //                 contents: `${BLUEPRINT_PROMPT}\n\nUser Input Context: ${rawInput}\nUser Request: ${promptPayload}`,
// //                 config: {
// //                     temperature: 0.4,
// //                 }
// //             });

// //             architecturalBlueprint = blueprintResponse.text;

// //             if (!architecturalBlueprint || !architecturalBlueprint.trim()) {
// //                 throw new Error("Phase 1 failed: Model returned an empty blueprint.");
// //             }

// //             // STATEFUL MUTATION: Save Phase 1 to Redis. If Phase 2 crashes the worker, the next retry remembers this.
// //             await job.updateData({
// //                 ...job.data,
// //                 cachedBlueprint: architecturalBlueprint
// //             });

// //             console.log(`[WORKER] Phase 1 Complete. Blueprint cached in Redis memory for safety.`);
// //         } else {
// //             console.log(`[WORKER] Phase 1 Skipped. Reusing cached Blueprint from previous attempt.`);
// //         }


// //         // ==========================================
// //         // STEP 2: THE COMPILER (JSON Translation with Retry Loop)
// //         // ==========================================
// //         console.log(`[WORKER] Phase 2: Compiling Blueprint to React Flow JSON...`);

// //         let parsedJson = null;
// //         let attempt = 0;
// //         const maxAttempts = 3;

// //         // Internal Loop: Handles Gemini formatting/parsing errors instantly without returning to the BullMQ queue
// //         while (attempt < maxAttempts) {
// //             attempt++;
// //             try {
// //                 const jsonResponse = await ai.models.generateContent({
// //                     model: "gemini-3.8-flash",
// //                     contents: `${MASTER_RULEBOOK}\n\nTranslate this exact Architecture Blueprint into strict JSON:\n\n${architecturalBlueprint}`,
// //                     config: {
// //                         responseMimeType: "application/json",
// //                         temperature: 0.1,
// //                     }
// //                 });

// //                 const generatedJsonString = jsonResponse.text;

// //                 // Strip Markdown formatting before parsing
// //                 const sanitizedJsonString = generatedJsonString
// //                     .replace(/^```json\s*/i, "")
// //                     .replace(/^```\s*/i, "")
// //                     .replace(/\s*```$/i, "")
// //                     .trim();

// //                 parsedJson = JSON.parse(sanitizedJsonString);

// //                 console.log(`[WORKER] Phase 2 successful on internal attempt ${attempt}.`);
// //                 break; // Break the internal loop on success

// //             } catch (phase2Error) {
// //                 console.warn(`[WORKER] Phase 2 Internal Attempt ${attempt} failed: ${phase2Error.message}`);

// //                 if (attempt >= maxAttempts) {
// //                     // This throw kicks it back to BullMQ. BullMQ will wait and retry the ENTIRE job.
// //                     // But next time, 'cachedBlueprint' will exist, so it skips Phase 1!
// //                     throw new Error(`Phase 2 permanently failed after ${maxAttempts} attempts. Last error: ${phase2Error.message}`);
// //                 }

// //                 console.log(`[WORKER] Waiting ${attempt * 2} seconds before retrying Phase 2 locally...`);
// //                 //
// //                 // NEW: 11 seconds, 22 seconds, 33 seconds
// //                 console.log(`[WORKER] Rate limit hit. Waiting ${attempt * 11} seconds before retrying...`);
// //                 await delay(attempt * 11000);
// //             }
// //         }

// //         // ==========================================
// //         // STEP 3: SUCCESS & CLEANUP
// //         // ==========================================
// //         await AiOrchestration.findByIdAndUpdate(orchestrationId, {
// //             status: 'completed',
// //             responsePayload: parsedJson,
// //             errorMessage: ""
// //         });

// //         // MEMORY CLEANUP: Wipe the blueprint from the job data so Redis frees the RAM
// //         await job.updateData({
// //             ...job.data,
// //             cachedBlueprint: null
// //         });

// //         console.log(`[WORKER] SUCCESS: AI Job ${orchestrationId} fully compiled.`);

// //     } catch (error) {
// //         console.error(`[WORKER] ERROR: AI Job ${orchestrationId} failed:`, error.message);
// //         throw error; // Let BullMQ handle the overall job retry
// //     }

// // }, { connection: redisConnection });

// // aiPromptWorker.on("completed", (job) => console.log(`Job ${job.id} removed from queue.`));

// // aiPromptWorker.on("failed", async (job, err) => {
// //     console.log(`[WORKER] Job ${job.id} failed overall attempt ${job.attemptsMade} of ${job.opts.attempts}.`);

// //     // If BullMQ has exhausted ALL overall retries, we mark the DB as failed and wipe the cache.
// //     if (job.attemptsMade >= job.opts.attempts) {
// //         console.log(`[WORKER] Job ${job.id} permanently failed at queue level. Alerting frontend and purging cache.`);

// //         if (job.data && job.data.orchestrationId) {
// //             await AiOrchestration.findByIdAndUpdate(job.data.orchestrationId, {
// //                 status: 'failed',
// //                 errorMessage: err.message
// //             });

// //             // MEMORY CLEANUP: Wipe the blueprint from Redis memory on final failure
// //             await job.updateData({
// //                 ...job.data,
// //                 cachedBlueprint: null
// //             });
// //         }
// //     }
// // });


// import { Worker } from "bullmq";
// import IORedis from "ioredis";
// import { GoogleGenAI } from "@google/genai";
// import { AiOrchestration } from "../models/AiOrchestration.model.js";
// import connectDB from "../data/connect.js";
// import { MASTER_RULEBOOK, BLUEPRINT_PROMPT } from "./promptRulebook.helper.js"

// const redisConnection = process.env.REDIS_URL
//     ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
//     : new IORedis({ host: "127.0.0.1", port: 6379, maxRetriesPerRequest: null });

// const ai = new GoogleGenAI({});

// connectDB();

// // Helper function to pause execution (Exponential Backoff)
// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// export const aiPromptWorker = new Worker("ai-prompt-queue", async (job) => {
//     // 1. We extract 'cachedBlueprint' from the job state. On try #1, this is undefined.
//     const { orchestrationId, rawInput, promptPayload, cachedBlueprint } = job.data;

//     console.log(`[WORKER] Picked up job ${orchestrationId} (Attempt ${job.attemptsMade + 1}). Executing Pipeline...`);

//     try {
//         await AiOrchestration.findByIdAndUpdate(orchestrationId, { status: 'processing' });

//         let architecturalBlueprint = cachedBlueprint;
//         const maxAttempts = 3;

//         // ==========================================
//         // STEP 1: THE THINKER (Logic & Blueprinting)
//         // ==========================================
//         // Skip Phase 1 entirely if we already have it in Redis memory
//         if (!architecturalBlueprint) {
//             console.log(`[WORKER] Phase 1: Drafting Conceptual Blueprint...`);

//             let phase1Attempt = 0;

//             // FIX: Added the while loop to Phase 1 so it respects the 11-second wait
//             while (phase1Attempt < maxAttempts) {
//                 phase1Attempt++;
//                 try {
//                     const blueprintResponse = await ai.models.generateContent({
//                         model: "gemini-3.8-flash", // FIX: Heavy reasoning for Phase 1
//                         contents: `${BLUEPRINT_PROMPT}\n\nUser Input Context: ${rawInput}\nUser Request: ${promptPayload}`,
//                         config: { temperature: 0.3 }
//                     });

//                     architecturalBlueprint = blueprintResponse.text;

//                     if (!architecturalBlueprint || !architecturalBlueprint.trim()) {
//                         throw new Error("Phase 1 failed: Model returned an empty blueprint.");
//                     }

//                     break; // Success! Break out of the Phase 1 retry loop

//                 } catch (phase1Error) {
//                     console.warn(`[WORKER] Phase 1 Attempt ${phase1Attempt} failed: ${phase1Error.message}`);

//                     if (phase1Attempt >= maxAttempts) {
//                         throw new Error(`Phase 1 permanently failed after ${maxAttempts} attempts. Last error: ${phase1Error.message}`);
//                     }

//                     console.log(`[WORKER] Rate limit hit. Waiting ${phase1Attempt * 11} seconds before retrying Phase 1...`);
//                     await delay(phase1Attempt * 11000);
//                 }
//             }

//             // STATEFUL MUTATION: Save Phase 1 to Redis.
//             await job.updateData({
//                 ...job.data,
//                 cachedBlueprint: architecturalBlueprint
//             });

//             console.log(`[WORKER] Phase 1 Complete. Blueprint cached in Redis memory for safety.`);
//         } else {
//             console.log(`[WORKER] Phase 1 Skipped. Reusing cached Blueprint from previous attempt.`);
//         }


//         // ==========================================
//         // STEP 2: THE COMPILER (JSON Translation with Retry Loop)
//         // ==========================================
//         console.log(`[WORKER] Phase 2: Compiling Blueprint to React Flow JSON...`);

//         let parsedJson = null;
//         let phase2Attempt = 0;

//         // Internal Loop: Handles Gemini formatting/parsing errors instantly
//         while (phase2Attempt < maxAttempts) {
//             phase2Attempt++;
//             try {
//                 const jsonResponse = await ai.models.generateContent({
//                     model: "gemini-3.5-flash-lite", // FIX: Fast JSON compiling for Phase 2
//                     contents: `${MASTER_RULEBOOK}\n\nTranslate this exact Architecture Blueprint into strict JSON:\n\n${architecturalBlueprint}`,
//                     config: {
//                         responseMimeType: "application/json",
//                         temperature: 0.1,
//                     }
//                 });

//                 const generatedJsonString = jsonResponse.text;

//                 // Strip Markdown formatting before parsing
//                 const sanitizedJsonString = generatedJsonString
//                     .replace(/^```json\s*/i, "")
//                     .replace(/^```\s*/i, "")
//                     .replace(/\s*```$/i, "")
//                     .trim();

//                 parsedJson = JSON.parse(sanitizedJsonString);

//                 console.log(`[WORKER] Phase 2 successful on internal attempt ${phase2Attempt}.`);
//                 break; // Break the internal loop on success

//             } catch (phase2Error) {
//                 console.warn(`[WORKER] Phase 2 Internal Attempt ${phase2Attempt} failed: ${phase2Error.message}`);

//                 if (phase2Attempt >= maxAttempts) {
//                     // This throw kicks it back to BullMQ.
//                     throw new Error(`Phase 2 permanently failed after ${maxAttempts} attempts. Last error: ${phase2Error.message}`);
//                 }

//                 console.log(`[WORKER] Rate limit hit. Waiting ${phase2Attempt * 11} seconds before retrying Phase 2...`);
//                 await delay(phase2Attempt * 11000);
//             }
//         }

//         // ==========================================
//         // STEP 3: SUCCESS & CLEANUP
//         // ==========================================
//         await AiOrchestration.findByIdAndUpdate(orchestrationId, {
//             status: 'completed',
//             responsePayload: parsedJson,
//             errorMessage: ""
//         });

//         // MEMORY CLEANUP: Wipe the blueprint from the job data so Redis frees the RAM
//         await job.updateData({
//             ...job.data,
//             cachedBlueprint: null
//         });

//         console.log(`[WORKER] SUCCESS: AI Job ${orchestrationId} fully compiled.`);

//     } catch (error) {
//         console.error(`[WORKER] ERROR: AI Job ${orchestrationId} failed:`, error.message);
//         throw error; // Let BullMQ handle the overall job retry
//     }

// }, { connection: redisConnection });

// aiPromptWorker.on("completed", (job) => console.log(`Job ${job.id} removed from queue.`));

// aiPromptWorker.on("failed", async (job, err) => {
//     console.log(`[WORKER] Job ${job.id} failed overall attempt ${job.attemptsMade} of ${job.opts.attempts}.`);

//     // If BullMQ has exhausted ALL overall retries, we mark the DB as failed and wipe the cache.
//     if (job.attemptsMade >= job.opts.attempts) {
//         console.log(`[WORKER] Job ${job.id} permanently failed at queue level. Alerting frontend and purging cache.`);

//         if (job.data && job.data.orchestrationId) {
//             await AiOrchestration.findByIdAndUpdate(job.data.orchestrationId, {
//                 status: 'failed',
//                 errorMessage: err.message
//             });

//             // MEMORY CLEANUP: Wipe the blueprint from Redis memory on final failure
//             await job.updateData({
//                 ...job.data,
//                 cachedBlueprint: null
//             });
//         }
//     }
// });


import { Worker } from "bullmq";
import IORedis from "ioredis";
import { GoogleGenAI } from "@google/genai";
import { AiOrchestration } from "../models/AiOrchestration.model.js";
import connectDB from "../data/connect.js";
import { MASTER_RULEBOOK, BLUEPRINT_PROMPT } from "./promptRulebook.helper.js";

const redisConnection = process.env.REDIS_URL
    ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
    : new IORedis({ host: "127.0.0.1", port: 6379, maxRetriesPerRequest: null });

const ai = new GoogleGenAI({});

connectDB();

// Helper function to pause execution (Exponential Backoff)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const aiPromptWorker = new Worker("ai-prompt-queue", async (job) => {
    // 1. We extract 'cachedBlueprint' from the job state. On try #1, this is undefined.
    const { orchestrationId, rawInput, promptPayload, cachedBlueprint } = job.data;

    console.log(`[WORKER] Picked up job ${orchestrationId} (Queue Attempt ${job.attemptsMade + 1}). Executing Pipeline...`);

    try {
        await AiOrchestration.findByIdAndUpdate(orchestrationId, { status: 'processing' });

        let architecturalBlueprint = cachedBlueprint;
        const maxAttempts = 3;

        // ==========================================
        // STEP 1: THE THINKER (Logic & Blueprinting)
        // ==========================================
        // Skip Phase 1 entirely if we already have it in Redis memory
        if (!architecturalBlueprint) {
            console.log(`[WORKER] Phase 1: Drafting Conceptual Blueprint...`);

            let phase1Attempt = 0;

            // Loop for Phase 1 so it respects the 11-second wait
            while (phase1Attempt < maxAttempts) {
                phase1Attempt++;
                try {
                    const blueprintResponse = await ai.models.generateContent({
                        model: "gemini-3.8-flash", // Official flagship reasoning model
                        contents: `${BLUEPRINT_PROMPT}\n\nUser Input Context: ${rawInput}\nUser Request: ${promptPayload}`,
                        config: { temperature: 0.3 }
                    });

                    architecturalBlueprint = blueprintResponse.text;

                    if (!architecturalBlueprint || !architecturalBlueprint.trim()) {
                        throw new Error("Phase 1 failed: Model returned an empty blueprint.");
                    }

                    break; // Success! Break out of the Phase 1 retry loop

                } catch (phase1Error) {
                    console.warn(`[WORKER] Phase 1 Attempt ${phase1Attempt} failed: ${phase1Error.message}`);

                    if (phase1Attempt >= maxAttempts) {
                        throw new Error(`Phase 1 permanently failed after ${maxAttempts} attempts. Last error: ${phase1Error.message}`);
                    }

                    console.log(`[WORKER] Rate limit hit. Waiting ${phase1Attempt * 11} seconds before retrying Phase 1...`);
                    await delay(phase1Attempt * 11000);
                }
            }

            // STATEFUL MUTATION: Save Phase 1 to Redis.
            await job.updateData({
                ...job.data,
                cachedBlueprint: architecturalBlueprint
            });

            console.log(`[WORKER] Phase 1 Complete. Blueprint cached in Redis memory for safety.`);
        } else {
            console.log(`[WORKER] Phase 1 Skipped. Reusing cached Blueprint from previous attempt.`);
        }


        // ==========================================
        // STEP 2: THE COMPILER (JSON Translation with Retry Loop)
        // ==========================================
        console.log(`[WORKER] Phase 2: Compiling Blueprint to React Flow JSON...`);

        let parsedJson = null;
        let phase2Attempt = 0;

        // Internal Loop: Handles Gemini formatting/parsing errors instantly
        while (phase2Attempt < maxAttempts) {
            phase2Attempt++;
            try {
                const jsonResponse = await ai.models.generateContent({
                    model: "gemini-3.5-flash-lite", // Official high-speed JSON model
                    contents: `${MASTER_RULEBOOK}\n\nTranslate this exact Architecture Blueprint into strict JSON:\n\n${architecturalBlueprint}`,
                    config: {
                        responseMimeType: "application/json",
                        temperature: 0.1,
                    }
                });

                const generatedJsonString = jsonResponse.text;

                // Strip Markdown formatting before parsing
                const sanitizedJsonString = generatedJsonString
                    .replace(/^```json\s*/i, "")
                    .replace(/^```\s*/i, "")
                    .replace(/\s*```$/i, "")
                    .trim();

                parsedJson = JSON.parse(sanitizedJsonString);

                console.log(`[WORKER] Phase 2 successful on internal attempt ${phase2Attempt}.`);
                break; // Break the internal loop on success

            } catch (phase2Error) {
                console.warn(`[WORKER] Phase 2 Internal Attempt ${phase2Attempt} failed: ${phase2Error.message}`);

                if (phase2Attempt >= maxAttempts) {
                    // This throw kicks it back to BullMQ.
                    throw new Error(`Phase 2 permanently failed after ${maxAttempts} attempts. Last error: ${phase2Error.message}`);
                }

                console.log(`[WORKER] Rate limit hit. Waiting ${phase2Attempt * 11} seconds before retrying Phase 2...`);
                await delay(phase2Attempt * 11000);
            }
        }

        // ==========================================
        // STEP 3: SUCCESS & CLEANUP
        // ==========================================
        await AiOrchestration.findByIdAndUpdate(orchestrationId, {
            status: 'completed',
            responsePayload: parsedJson,
            errorMessage: ""
        });

        // MEMORY CLEANUP: Wipe the blueprint from the job data so Redis frees the RAM
        await job.updateData({
            ...job.data,
            cachedBlueprint: null
        });

        console.log(`[WORKER] SUCCESS: AI Job ${orchestrationId} fully compiled.`);

    } catch (error) {
        console.error(`[WORKER] ERROR: AI Job ${orchestrationId} failed:`, error.message);
        throw error; // Let BullMQ handle the overall job retry
    }

}, {
    connection: redisConnection
});

aiPromptWorker.on("completed", (job) => console.log(`[WORKER] Job ${job.id} removed from queue.`));

aiPromptWorker.on("failed", async (job, err) => {
    console.log(`[WORKER] Job ${job.id} failed overall queue attempt ${job.attemptsMade} of ${job.opts.attempts}.`);

    // If BullMQ has exhausted ALL overall retries, we mark the DB as failed and wipe the cache.
    if (job.attemptsMade >= job.opts.attempts) {
        console.log(`[WORKER] Job ${job.id} permanently failed at queue level. Alerting frontend and purging cache.`);

        if (job.data && job.data.orchestrationId) {
            await AiOrchestration.findByIdAndUpdate(job.data.orchestrationId, {
                status: 'failed',
                errorMessage: err.message
            });

            // MEMORY CLEANUP: Wipe the blueprint from Redis memory on final failure
            await job.updateData({
                ...job.data,
                cachedBlueprint: null
            });
        }
    }
});
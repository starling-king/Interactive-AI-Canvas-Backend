import { Queue } from "bullmq";
import IORedis from "ioredis";


// const redisConnection = new IORedis({
//     host: "127.0.0.1",
//     port: 6379,
//     maxRetriesPerRequest: null, 
// });

const redisConnection = process.env.REDIS_URL
    ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
    : new IORedis({ host: "127.0.0.1", port: 6379, maxRetriesPerRequest: null });

export const aiPromptQueue = new Queue("ai-prompt-queue", {
    connection: redisConnection
});

console.log("Redis Queue 'ai-prompt-queue' initialized successfully.");
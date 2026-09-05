import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";

import { app } from "../utils/app.js";
import connectDB from "../data/connect.js";
import { Admin } from "../models/User.model.js";
import { Workspace } from "../models/Workspace.model.js";
import { AiOrchestration } from "../models/AiOrchestration.model.js";

// STRATEGIC LEVERAGE: We mock the Redis Queue so our tests run instantly without needing a live Redis server!
vi.mock("../services/aiQueue.service.js", () => ({
    aiPromptQueue: {
        add: vi.fn().mockResolvedValue({ id: "mocked-bullmq-job-999" })
    }
}));

const DUMMY_USER = {
    username: "aigod999",
    email: "aigod999@gmail.com",
    passwordHash: "12345678"
};

let accessToken = "";
let workspaceId = "";
let orchestrationId = ""; 

beforeAll(async () => {
    await connectDB();
});

afterAll(async () => {
    const user = await Admin.findOne({ email: DUMMY_USER.email });
    if (user) {
        await Workspace.deleteMany({ userId: user._id });
        await AiOrchestration.deleteMany({ workspaceId: { $in: await Workspace.find({ userId: user._id }).select('_id') } });
    }
    await Admin.deleteOne({ email: DUMMY_USER.email });
    await mongoose.connection.close();
});

describe("AI Orchestration Pipeline (Brutal Edge Cases)", () => {

    // beforeEach(async () => {
    //     // 1. Clean Slate
    //     await Admin.deleteMany({ $or: [{ email: DUMMY_USER.email }, { username: DUMMY_USER.username }] });

    //     // 2. Register & Login
    //     await request(app).post("/api/v1/users/register").send(DUMMY_USER);
    //     const loginRes = await request(app).post("/api/v1/users/login").send({
    //         email: DUMMY_USER.email,
    //         passwordHash: DUMMY_USER.passwordHash,
    //     });
    //     accessToken = loginRes.body.data.accessToken;

    //     // 3. Create a Workspace to run AI generations inside
    //     const workspaceRes = await request(app)
    //         .post("/api/v1/workspaces/createWorkspace")
    //         .set("Cookie", [`accessToken=${accessToken}`])
    //         .send({
    //             title: "AI Test Architecture",
    //             diagramType: "flowchart",
    //             isPublished: false
    //         });
    //     workspaceId = workspaceRes.body?.data?._id;
    // });

    beforeEach(async () => {
        // 1. Clean Slate
        await Admin.deleteMany({ $or: [{ email: DUMMY_USER.email }, { username: DUMMY_USER.username }] });

        // 2. Register & Catch Errors
        const regRes = await request(app).post("/api/v1/users/register").send(DUMMY_USER);
        if (regRes.statusCode !== 201) console.error("TEST REGISTRATION FAILED:", regRes.body);

        // 3. Login & Catch Errors
        const loginRes = await request(app).post("/api/v1/users/login").send({
            email: DUMMY_USER.email,
            passwordHash: DUMMY_USER.passwordHash,
        });
        if (loginRes.statusCode !== 200) console.error("TEST LOGIN FAILED:", loginRes.body);

        accessToken = loginRes.body.data.accessToken;

        // 4. Create a Workspace to run AI generations inside
        const workspaceRes = await request(app)
            .post("/api/v1/workspaces/createWorkspace")
            .set("Cookie", [`accessToken=${accessToken}`])
            .send({
                title: "AI Test Architecture",
                diagramType: "flowchart",
                isPublished: false
            });
        
        if (workspaceRes.statusCode !== 200) console.error("TEST WORKSPACE FAILED:", workspaceRes.body);
        
        workspaceId = workspaceRes.body?.data?._id;
    });

    afterEach(async () => {

        if (workspaceId) {
            await AiOrchestration.deleteMany({ workspaceId: workspaceId });
            await Workspace.deleteMany({ _id: workspaceId });
        }

    });

    // ==========================================
    // PHASE 1: SUBMIT (THE CASHIER) TESTS
    // ==========================================

    it("1. [SUCCESS] should successfully accept a valid prompt and queue the job", async () => {
        const res = await request(app)
            .post(`/api/v1/ai/submit/${workspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`])
            .send({
                inputType: "structuredForm",
                rawInput: "Design a simple e-commerce checkout flow.",
                promptPayload: "3 nodes, 2 edges."
            });

        expect(res.statusCode).toBe(202);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("queued");
        expect(res.body.data.bullmqJobId).toBe("mocked-bullmq-job-999");

        // Save this for the polling tests!
        orchestrationId = res.body.data._id;
    });

    it("2. [ATTACK] should aggressively block massive payloads to protect API limits (Zod Firewall)", async () => {
        // Generating a 6000 character string to simulate a massive copy-paste attack
        const massiveString = "a".repeat(6000);

        const res = await request(app)
            .post(`/api/v1/ai/submit/${workspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`])
            .send({
                inputType: "rawCode",
                rawInput: massiveString, // Over the 5000 char limit!
                promptPayload: "Parse this."
            });

        // The Zod middleware should intercept this and throw a 400 Bad Request
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("3. [SECURITY] should block a user from submitting AI jobs to a workspace they do not own", async () => {
        const fakeWorkspaceId = new mongoose.Types.ObjectId().toString();

        const res = await request(app)
            .post(`/api/v1/ai/submit/${fakeWorkspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`])
            .send({
                inputType: "structuredForm",
                rawInput: "Hello AI",
                promptPayload: "Test"
            });

        // Expecting 403 Forbidden
        expect(res.statusCode).toBe(403);
    });

    // ==========================================
    // PHASE 2: POLLING (THE ORDER SCREEN) TESTS
    // ==========================================

    it("4. [SUCCESS] should return 202 Accepted if the AI is still processing", async () => {
        // Step A: Manually inject a 'processing' document into MongoDB
        const doc = await AiOrchestration.create({
            workspaceId: workspaceId,
            bullmqJobId: "processing-123",
            inputType: "rawCode",
            rawInput: "test",
            promptPayload: "test",
            status: "processing"
        });

        // Step B: Poll it
        const res = await request(app)
            .get(`/api/v1/ai/poll/${doc._id}`)
            .set("Cookie", [`accessToken=${accessToken}`]);

        expect(res.statusCode).toBe(202);
        expect(res.body.message).toContain("still processing");
    });

    it("5. [SUCCESS] should return 200 OK and the heavy payload when AI finishes", async () => {
        // Step A: Manually inject a 'completed' document with fake AI JSON
        const fakeAiPayload = { nodesData: [{ id: "1" }], edgesData: [] };

        const doc = await AiOrchestration.create({
            workspaceId: workspaceId,
            bullmqJobId: "done-123",
            inputType: "rawCode",
            rawInput: "test",
            promptPayload: "test",
            status: "completed",
            responsePayload: fakeAiPayload
        });

        // Step B: Poll it
        const res = await request(app)
            .get(`/api/v1/ai/poll/${doc._id}`)
            .set("Cookie", [`accessToken=${accessToken}`]);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.status).toBe("completed");
        expect(res.body.data.responsePayload.nodesData[0].id).toBe("1");
    });
});
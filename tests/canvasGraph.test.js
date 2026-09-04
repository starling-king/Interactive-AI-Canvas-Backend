import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";

import { app } from "../utils/app.js";
import connectDB from "../data/connect.js";
import { Admin } from "../models/User.model.js";
import { Workspace } from "../models/Workspace.model.js";
import { CanvasGraph } from "../models/CanvasGraph.model.js";

const DUMMY_USER = {
    username: "canvasmaster",
    email: "canvasmaster@gmail.com",
    passwordHash: "12345678"
};

const DUMMY_WORKSPACE = {
    title: "Test Architecture Diagram",
    diagramType: "flowchart",
    isPublished: false
};

const DUMMY_CANVAS_PAYLOAD = {
    nodesData: [
        {
            id: "node-1",
            type: "flowchart",
            position: { x: 100, y: 150 },
            data: { label: "Start Process", formula: "x + 1" }
        }
    ],
    edgesData: [],
    viewport: { x: 2, y: 1, zoom: 15 },
    globalMetrics: { iterationCount: 1 }
};

// Global tokens and IDs needed across tests
let accessToken = "";
let workspaceId = "";

// 1. GLOBAL SETUP
beforeAll(async () => {
    await connectDB();
});

// 2. GLOBAL TEARDOWN
afterAll(async () => {
    const user = await Admin.findOne({ email: DUMMY_USER.email });
    if (user) {
        await Workspace.deleteMany({ userId: user._id });
    }
    await Admin.deleteOne({ email: DUMMY_USER.email });
    await mongoose.connection.close();
});

describe("Canvas Graph Pipeline (Upsert & Aggregation)", () => {

    // SETUP: Before every test, we need a fresh User and a fresh Workspace
    beforeEach(async () => {
        // 1. Clear previous test data
        await Admin.deleteOne({ email: DUMMY_USER.email });

        // 2. Register & Login to get the JWT token
        await request(app).post("/api/v1/users/register").send(DUMMY_USER);
        const loginRes = await request(app).post("/api/v1/users/login").send({
            email: DUMMY_USER.email,
            passwordHash: DUMMY_USER.passwordHash
        });
        accessToken = loginRes.body.data.accessToken;

        // 3. Create a Workspace to attach the Canvas to
        const workspaceRes = await request(app)
            .post("/api/v1/workspaces/createWorkspace")
            .set("Cookie", [`accessToken=${accessToken}`])
            .send(DUMMY_WORKSPACE);

        // Save the Mongo _id of the workspace to use in our route params
        workspaceId = workspaceRes.body.data._id;
    });

    // CLEANUP: Wipe the canvas data after each test so they don't contaminate each other
    afterEach(async () => {
        await CanvasGraph.deleteMany({ workspaceId: workspaceId });
        await Workspace.deleteMany({ _id: workspaceId });
    });

    // TEST 1: The Initial Save (Insert)
    it("should create a new canvas graph on the very first save", async () => {
        const res = await request(app)
            .post(`/api/v1/canvas/${workspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`])
            .send(DUMMY_CANVAS_PAYLOAD);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.nodesData.length).toBe(1);
        expect(res.body.data.nodesData[0].id).toBe("node-1");
    });

    // TEST 2: The Auto-Save (Upsert check - STRATEGIC LEVERAGE)
    it("should update the existing canvas graph without creating a duplicate row", async () => {
        // First save
        await request(app)
            .post(`/api/v1/canvas/${workspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`])
            .send(DUMMY_CANVAS_PAYLOAD);

        // Modify payload slightly (simulate user adding a second node)
        const updatedPayload = { ...DUMMY_CANVAS_PAYLOAD };
        updatedPayload.nodesData.push({
            id: "node-2",
            type: "decisionGate",
            position: { x: 300, y: 150 },
            data: { label: "Check Gate" }
        });

        // Second save (Auto-save trigger)
        const res = await request(app)
            .post(`/api/v1/canvas/${workspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`])
            .send(updatedPayload);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.nodesData.length).toBe(2); // Proves the update worked

        // Verify in DB that only ONE record exists (Minimax duplicate prevention)
        const count = await CanvasGraph.countDocuments({ workspaceId: workspaceId });
        expect(count).toBe(1);
    });

    // TEST 3: The Single-Ping Fetch (Aggregation Pipeline Check)
    it("should successfully fetch the canvas graph using the aggregation pipeline", async () => {
        // Seed the database first by saving
        await request(app)
            .post(`/api/v1/canvas/${workspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`])
            .send(DUMMY_CANVAS_PAYLOAD);

        // Fetch it using GET
        const res = await request(app)
            .get(`/api/v1/canvas/${workspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`]);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);

        // Because of the $unwind stage, canvasData is a direct object
        expect(res.body.data.canvasData.nodesData).toBeDefined();
        expect(res.body.data.canvasData.nodesData[0].id).toBe("node-1");
    });

    // TEST 4: The Bouncer (Security Guard)
    it("should block saving if the user does not own the workspace", async () => {
        // Generate a random valid MongoDB ID that the user definitely doesn't own
        const fakeWorkspaceId = new mongoose.Types.ObjectId().toString();

        const res = await request(app)
            .post(`/api/v1/canvas/${fakeWorkspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`])
            .send(DUMMY_CANVAS_PAYLOAD);

        // Expecting 403 Unauthorized because of our .findOne() ownership check
        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
    });
});
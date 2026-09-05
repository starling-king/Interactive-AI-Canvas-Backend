import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";

import { app } from "../utils/app.js";
import connectDB from "../data/connect.js";
import { Admin } from "../models/User.model.js";
import { Workspace } from "../models/Workspace.model.js";
import { CanvasGraph } from "../models/CanvasGraph.model.js";
import { GraphVersion } from "../models/GraphVersion.model.js";

// UNIQUE USER to prevent Vitest parallel threading collisions
const DUMMY_USER = {
    username: "versionmaster",
    email: "versionmaster@gmail.com",
    passwordHash: "12345678"
};

const DUMMY_WORKSPACE = {
    title: "Time Machine Diagram",
    diagramType: "flowchart",
    isPublished: false
};

const DUMMY_CANVAS_PAYLOAD = {
    nodesData: [{ id: "node-1", position: { x: 100, y: 150 } }],
    edgesData: [],
    viewport: { x: 2, y: 1, zoom: 15 },
    globalMetrics: { iterationCount: 1 }
};

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

describe("Graph Versioning Pipeline (The Time Machine)", () => {

    // SETUP: We need a User, a Workspace, AND an active Canvas Graph to take a snapshot of.
    beforeEach(async () => {
        await Admin.deleteOne({ email: DUMMY_USER.email });

        // 1. Register & Login
        await request(app).post("/api/v1/users/register").send(DUMMY_USER);
        const loginRes = await request(app).post("/api/v1/users/login").send({
            email: DUMMY_USER.email,
            passwordHash: DUMMY_USER.passwordHash
        });
        accessToken = loginRes.body.data.accessToken;

        // 2. Create Workspace
        const workspaceRes = await request(app)
            .post("/api/v1/workspaces/createWorkspace")
            .set("Cookie", [`accessToken=${accessToken}`])
            .send(DUMMY_WORKSPACE);
        workspaceId = workspaceRes.body.data._id;

        // 3. Create the LIVE Canvas (The subject of our photographs)
        await request(app)
            .post(`/api/v1/canvas/${workspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`])
            .send(DUMMY_CANVAS_PAYLOAD);
    });

    // CLEANUP
    afterEach(async () => {
        await GraphVersion.deleteMany({ workspaceId: workspaceId });
        await CanvasGraph.deleteMany({ workspaceId: workspaceId });
        await Workspace.deleteMany({ _id: workspaceId });
    });

    // TEST 1: The Photographer (Save Version)
    it("should successfully take a snapshot of the live canvas", async () => {
        const res = await request(app)
            .post(`/api/v1/versions/workspace/${workspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`])
            .send({ changeSummary: "Initial Architecture Setup" });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.versionNumber).toBe(1);
        expect(res.body.data.stateSnapshot.nodesData[0].id).toBe("node-1");
    });

    // TEST 2: The Optimized Historian (Sidebar Log)
    it("should fetch history log without the heavy stateSnapshot payload", async () => {
        // Create a version first
        await request(app)
            .post(`/api/v1/versions/workspace/${workspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`])
            .send({ changeSummary: "Version 1" });

        const res = await request(app)
            .get(`/api/v1/versions/workspace/${workspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`]);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBe(1);
        
        // STRATEGIC CHECK: Prove the .select("-stateSnapshot") optimization works!
        expect(res.body.data[0].stateSnapshot).toBeUndefined();
    });

    // TEST 3: The Ultimate Undo (Restore & Re-log)
    it("should overwrite live canvas and create a new history log when restoring", async () => {
        // A. Create Version 1
        const v1Res = await request(app)
            .post(`/api/v1/versions/workspace/${workspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`])
            .send({ changeSummary: "Base Canvas" });
        const version1Id = v1Res.body.data._id;

        // B. Alter the live canvas (Simulating user doing more work)
        await request(app)
            .post(`/api/v1/canvas/${workspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`])
            .send({ ...DUMMY_CANVAS_PAYLOAD, nodesData: [{ id: "node-BAD", position: { x: 0, y: 0 } }] });

        // C. Restore back to Version 1
        const restoreRes = await request(app)
            .post(`/api/v1/versions/restore/${version1Id}`)
            .set("Cookie", [`accessToken=${accessToken}`]);

        expect(restoreRes.statusCode).toBe(200);
        expect(restoreRes.body.success).toBe(true);
        
        // Prove the live canvas was reverted
        expect(restoreRes.body.data.nodesData[0].id).toBe("node-1");

        // D. Verify the Second-Order Strategy: A new Version 2 was created!
        const historyRes = await request(app)
            .get(`/api/v1/versions/workspace/${workspaceId}`)
            .set("Cookie", [`accessToken=${accessToken}`]);

        expect(historyRes.body.data.length).toBe(2);
        expect(historyRes.body.data[0].versionNumber).toBe(2);
        expect(historyRes.body.data[0].changeSummary).toContain("Restored back to Version 1");
    });
});
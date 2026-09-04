import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";

import { app } from "../utils/app.js";
import connectDB from "../data/connect.js";
import { Admin } from "../models/User.model.js";
import { Workspace } from "../models/Workspace.model.js";

const DUMMY_USER = {
    username: "workspacemaster",
    email: "master@gmail.com",
    passwordHash: "12345678"
};

let accessToken = "";
let testWorkspaceSlug = "";

beforeAll(async () => {
    await connectDB();
});

afterAll(async () => {
    await Workspace.deleteMany({ userId: await Admin.findOne({ email: DUMMY_USER.email }).select('_id') });
    await Admin.deleteOne({ email: DUMMY_USER.email });
    await mongoose.connection.close();
});

describe("Workspace Security & Creation Pipeline", () => {
    // SETUP: Create user and get token
    beforeEach(async () => {
        await Admin.deleteOne({ email: DUMMY_USER.email });
        await Workspace.deleteMany({ title: "My Awesome Architecture" });
        await request(app).post("/api/v1/users/register").send(DUMMY_USER);

        const loginRes = await request(app).post("/api/v1/users/login").send({
            email: DUMMY_USER.email,
            passwordHash: DUMMY_USER.passwordHash,
        });
        accessToken = loginRes.body.data.accessToken;
    });

    // 1. Test Data Integrity (Slug Generation)
    it("should successfully create a workspace and generate a slug", async () => {
        const res = await request(app)
            .post("/api/v1/workspaces/createWorkspace")
            .set("Cookie", [`accessToken=${accessToken}`])
            .send({
                title: "My Awesome Architecture",
                diagramType: "flowchart",
                isPublished: false // Private by default
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.slug).toBeDefined();

        testWorkspaceSlug = res.body.data.slug; // Save slug for the next test
    });


    it("should block public access to a private workspace", async () => {
        // Step A: Create a fresh private workspace just for this test
        const setupRes = await request(app)
            .post("/api/v1/workspaces/createWorkspace")
            .set("Cookie", [`accessToken=${accessToken}`])
            .send({
                title: "Top Secret Diagram",
                diagramType: "flowchart",
                isPublished: false // Private by default
            });

        const secureSlug = setupRes.body.data.slug;

        // Step B: Attempt to access it via the public route
        const res = await request(app)
            .get(`/api/v1/workspaces/public/${secureSlug}`);

        // Expecting 403 because isPublished is false
        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
    });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";


// Load environment variables (.env)


import { app } from "../utils/app.js";
import connectDB from "../data/connect.js";
import { Admin } from "../models/User.model.js";

const DUMMY_USER = {
  userName: "monkeyman",
  email: "Monkeyman@gmail.com",
  password: "SecurePassword123"
};

describe("User Authentication & Registration Pipeline", () => {
  // 1. Connect to Database before tests start
  beforeAll(async () => {
    await connectDB();
  });

  // 2. Clean up test user & close database connection when tests finish
  afterAll(async () => {
    await Admin.deleteOne({ email: DUMMY_USER.email });
    await mongoose.connection.close();
  });

  // 3. Test: Register dummy user
  it("should successfully register a dummy user and return valid response", async () => {
    // Ensure clean state before registering
    await Admin.deleteOne({ email: DUMMY_USER.email });

    const res = await request(app)
      .post("/api/v1/users/register")
      .send(DUMMY_USER);

    // Verify response
    expect(res.statusCode).toBe(201); // or 200 depending on your controller status
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(DUMMY_USER.email);
    expect(res.body.data.userName).toBe(DUMMY_USER.userName);

    // Security Check: Ensure raw password was never returned
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  // 4. Test: Block duplicate user registration
  it("should reject registration if email already exists", async () => {
    const res = await request(app)
      .post("/api/v1/users/register")
      .send(DUMMY_USER);

    // Should return conflict error
    expect(res.statusCode).toBe(409); // or 400 depending on your ApiError code
    expect(res.body.success).toBe(false);
  });
});
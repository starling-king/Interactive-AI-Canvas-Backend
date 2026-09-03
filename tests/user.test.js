import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";

import { app } from "../utils/app.js";
import connectDB from "../data/connect.js";
import { Admin } from "../models/User.model.js";

const DUMMY_USER = {
  username: "monkeyman",
  email: "monkeyman@gmail.com",
  passwordHash: "12345678"
};

// 1. GLOBAL SETUP: Connect once for the whole file
beforeAll(async () => {
  await connectDB();
});

// 2. GLOBAL TEARDOWN: Close once after ALL test suites are finished
afterAll(async () => {
  await Admin.deleteOne({ email: DUMMY_USER.email });
  await mongoose.connection.close();
});

describe("User Authentication & Registration Pipeline", () => {
  it("should successfully register a dummy user and return valid response", async () => {
    await Admin.deleteOne({ email: DUMMY_USER.email });

    const res = await request(app)
      .post("/api/v1/users/register")
      .send(DUMMY_USER);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(DUMMY_USER.email);
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it("should reject registration if email already exists", async () => {
    const res = await request(app)
      .post("/api/v1/users/register")
      .send(DUMMY_USER);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

describe("User Login Pipeline", () => {
  beforeEach(async () => {
    await Admin.deleteOne({ email: DUMMY_USER.email });
    // Manually inject user for login testing
    await Admin.create({
      username: DUMMY_USER.username,
      email: DUMMY_USER.email,
      passwordHash: DUMMY_USER.passwordHash
    });
  });

  afterEach(async () => {
    await Admin.deleteOne({ email: DUMMY_USER.email });
  });

  it("should successfully log in an existing user and return tokens", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({
        email: DUMMY_USER.email,
        passwordHash: DUMMY_USER.passwordHash
      });

    if (res.statusCode !== 200) console.log("LOGIN CONFESSION:", res.body);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should reject login with incorrect password", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({
        email: DUMMY_USER.email,
        passwordHash: "99999999"
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should reject login for non-existent user", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({
        email: "ghost@gmail.com",
        passwordHash: DUMMY_USER.passwordHash
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe("User Protected Security Pipeline", () => {
  let accessToken = "";
  let refreshToken = "";

  // SETUP: Before every test, we must register and login to get fresh tokens
  beforeEach(async () => {
    await Admin.deleteOne({ email: DUMMY_USER.email });

    // 1. Register the user
    await request(app).post("/api/v1/users/register").send(DUMMY_USER);

    // 2. Log them in to generate the tokens
    const loginRes = await request(app)
      .post("/api/v1/users/login")
      .send({
        email: DUMMY_USER.email,
        passwordHash: DUMMY_USER.passwordHash,
      });

    // 3. Steal the tokens for our tests
    accessToken = loginRes.body.data.accessToken;

    // The refresh token is hidden inside the HTTP-only cookie, so we extract it[cite: 27]:
    const cookies = loginRes.headers["set-cookie"];
    const refreshCookie = cookies.find((c) => c.startsWith("refreshToken="));
    refreshToken = refreshCookie.split(";")[0].replace("refreshToken=", "");
  });

  afterEach(async () => {
    await Admin.deleteOne({ email: DUMMY_USER.email });
  });

  // 1. Test: Refresh Token (The Silent Killer)
  it("should successfully generate new tokens using a valid refresh token", async () => {
    const res = await request(app)
      .post("/api/v1/users/refreshAccessToken")
      .send({ refreshToken: refreshToken }); // Controller accepts it via req.body[cite: 27]

    if (res.statusCode !== 200) console.log("REFRESH CONFESSION:", res.body);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  // 2. Test: Change Password (The Vault Door)
  it("should successfully change the password with correct old password", async () => {
    const res = await request(app)
      .post("/api/v1/users/changePassword")
      .set("Cookie", [`accessToken=${accessToken}`]) // Bypass verifyJwt middleware[cite: 26]
      .send({
        oldpassword: DUMMY_USER.passwordHash,
        newpassword: "87654321", // New valid 8-digit password[cite: 28]
      });

    if (res.statusCode !== 200) console.log("PASSWORD CONFESSION:", res.body);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 3. Test: Logout (The Kill Switch)
  it("should successfully log out and clear security cookies", async () => {
    const res = await request(app)
      .post("/api/v1/users/logout")
      .set("Cookie", [`accessToken=${accessToken}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify the cookies were actually destroyed in the response[cite: 27]
    const setCookieHeader = res.headers["set-cookie"];
    expect(setCookieHeader).toBeDefined();

    // Express clears cookies by setting their value to empty and expiry to a past date
    const isAccessTokenCleared = setCookieHeader.some(c => c.includes("accessToken=;") || c.includes("Expires="));
    expect(isAccessTokenCleared).toBe(true);
  });
});
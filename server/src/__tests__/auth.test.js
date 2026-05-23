import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import path from "path";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { USER_ROLES } from "../constants/roles.js";
import User from "../models/User.js";

jest.setTimeout(300000);

let app;
let mongoServer;
let clearRefreshTokenBlacklistForTests;
let generateTokenPair;

const validPassword = "SecurePassword123";

const registerPayload = {
  name: "Student User",
  email: "student@example.com",
  password: validPassword,
  role: USER_ROLES.STUDENT
};

const registerUser = (overrides = {}) =>
  request(app)
    .post("/api/auth/register")
    .send({
      ...registerPayload,
      ...overrides
    });

const loginUser = (email = registerPayload.email, password = validPassword) =>
  request(app).post("/api/auth/login").send({ email, password });

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.PORT = "5001";
  process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-chars";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-chars";
  process.env.JWT_ACCESS_EXPIRY = "15m";
  process.env.JWT_REFRESH_EXPIRY = "7d";
  process.env.CLIENT_URL = "http://localhost:5173";
  process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(process.cwd(), ".mongodb-binaries");

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  await mongoose.connect(process.env.MONGODB_URI);
  const authServiceModule = await import("../services/authService.js");
  clearRefreshTokenBlacklistForTests = authServiceModule.clearRefreshTokenBlacklistForTests;
  generateTokenPair = authServiceModule.generateTokenPair;

  const appModule = await import("../app.js");
  app = appModule.default;
});

afterEach(async () => {
  if (!User) {
    return;
  }

  await User.deleteMany({});
  clearRefreshTokenBlacklistForTests();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe("authentication", () => {
  it("registers a new user successfully", async () => {
    const response = await registerUser().expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(registerPayload.email);
    expect(response.body.data.user.role).toBe(USER_ROLES.STUDENT);
    expect(response.body.data.user.passwordHash).toBeUndefined();

    const storedUser = await User.findOne({ email: registerPayload.email }).select("+passwordHash");
    expect(storedUser).toBeTruthy();
    expect(storedUser.passwordHash).toMatch(/^\$2/);
  });

  it("returns 409 when registering with a duplicate email", async () => {
    await registerUser().expect(201);

    const response = await registerUser({
      name: "Duplicate User"
    }).expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("DUPLICATE_RESOURCE");
  });

  it("logs in with correct credentials and returns a token pair", async () => {
    await registerUser().expect(201);

    const response = await loginUser().expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.refreshToken).toEqual(expect.any(String));
    expect(response.body.data.user.email).toBe(registerPayload.email);
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it("returns 401 when logging in with the wrong password", async () => {
    await registerUser().expect(201);

    const response = await loginUser(registerPayload.email, "WrongPassword123").expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("allows a protected route with a valid access token", async () => {
    await registerUser().expect(201);
    const loginResponse = await loginUser().expect(200);

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${loginResponse.body.data.accessToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(registerPayload.email);
    expect(response.body.data.role).toBe(USER_ROLES.STUDENT);
  });

  it("returns 401 TOKEN_EXPIRED for an expired access token", async () => {
    await registerUser().expect(201);
    const user = await User.findOne({ email: registerPayload.email });
    const expiredToken = jwt.sign(
      {
        sub: user._id.toString(),
        role: user.role
      },
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: "-1s"
      }
    );

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`)
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("TOKEN_EXPIRED");
  });

  it("returns 401 TOKEN_MISSING when no access token is provided", async () => {
    const response = await request(app).get("/api/auth/me").expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("TOKEN_MISSING");
  });

  it("refreshes tokens and returns a new token pair", async () => {
    await registerUser().expect(201);
    const loginResponse = await loginUser().expect(200);

    const response = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: loginResponse.body.data.refreshToken })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.refreshToken).toEqual(expect.any(String));
    expect(response.body.data.user.email).toBe(registerPayload.email);
  });

  it("returns 403 when a student accesses an admin route", async () => {
    await registerUser().expect(201);
    const user = await User.findOne({ email: registerPayload.email });
    const tokens = generateTokenPair(user);

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("allows an admin to access an admin route", async () => {
    await registerUser({
      name: "Admin User",
      email: "admin@example.com",
      role: USER_ROLES.ADMIN
    }).expect(201);
    const user = await User.findOne({ email: "admin@example.com" });
    const tokens = generateTokenPair(user);

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});

import request from "supertest";
import app from "../../src/app.js";

describe("GET /api/health", () => {
  it("returns the API health payload", async () => {
    const response = await request(app).get("/api/health").expect(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        service: "samagama-navigator-api",
        status: "ok",
        environment: "test"
      }
    });
  });
});

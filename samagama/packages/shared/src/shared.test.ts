import { describe, expect, it } from "vitest";
import {
  canAdminister,
  canModerate,
  duplicateCheckSchema,
  faqSearchSchema,
  toSlug
} from "./index.js";

describe("shared contracts", () => {
  it("keeps role hierarchy explicit", () => {
    expect(canModerate("student")).toBe(false);
    expect(canModerate("moderator")).toBe(true);
    expect(canAdminister("moderator")).toBe(false);
    expect(canAdminister("admin")).toBe(true);
  });

  it("validates duplicate checks before services run", () => {
    const result = duplicateCheckSchema.safeParse({
      title: "How do I submit my NOC?",
      body: "Please explain the full NOC submission process."
    });
    expect(result.success).toBe(true);
  });

  it("creates stable slugs", () => {
    expect(toSlug("Login & Access: Reset Password")).toBe("login-access-reset-password");
  });

  it("coerces single query filter ids into arrays", () => {
    const result = faqSearchSchema.parse({
      categoryIds: "category-1",
      tagIds: "tag-1"
    });
    expect(result.categoryIds).toEqual(["category-1"]);
    expect(result.tagIds).toEqual(["tag-1"]);
  });
});

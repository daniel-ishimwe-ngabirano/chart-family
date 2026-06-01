import { describe, it, expect } from "vitest";
import { sanitizeHtml, stripHtmlTags, generateUsername, isValidFileType } from "./index.js";

describe("sanitizeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("preserves safe text", () => {
    expect(sanitizeHtml("Hello, world!")).toBe("Hello, world!");
  });
});

describe("stripHtmlTags", () => {
  it("removes HTML tags", () => {
    expect(stripHtmlTags("<p>Hello</p>")).toBe("Hello");
  });

  it("handles nested tags", () => {
    expect(stripHtmlTags("<div><p>Nested</p></div>")).toBe("Nested");
  });

  it("returns empty string for only tags", () => {
    expect(stripHtmlTags("<br/>")).toBe("");
  });
});

describe("generateUsername", () => {
  it("generates a username from full name", () => {
    const result = generateUsername("John Doe");
    expect(result).toMatch(/^john_doe_[a-z0-9]{4}$/);
  });

  it("handles special characters in name", () => {
    const result = generateUsername("Alice!@#Smith");
    expect(result).toMatch(/^alice___smith_[a-z0-9]{4}$/);
  });
});

describe("isValidFileType", () => {
  it("accepts allowed image types", () => {
    expect(isValidFileType("image/jpeg")).toBe(true);
    expect(isValidFileType("image/png")).toBe(true);
  });

  it("rejects disallowed types", () => {
    expect(isValidFileType("text/html")).toBe(false);
    expect(isValidFileType("application/x-executable")).toBe(false);
  });
});

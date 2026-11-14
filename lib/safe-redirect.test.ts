import { describe, expect, it } from "vitest";
import { getSafeCallbackUrl } from "./safe-redirect";

// Tabel kasus minimal dari front-end-flow.md ("Guard dan callbackURL"),
// ditambah beberapa varian serangan yang wajar.
describe("getSafeCallbackUrl", () => {
  it.each([
    ["/learn/a/b", "/learn/a/b"],
    ["/learn/a/b?x=1#h", "/learn/a/b?x=1#h"],
    ["/dashboard", "/dashboard"],
    ["/", "/"],
    ["/learn/a/b?x=1", "/learn/a/b?x=1"],
    ["  /learn/a/b  ", "/learn/a/b"],
    ["%2Flearn%2Fa", "/learn/a"],
  ])("path internal %s → %s", (input, expected) => {
    expect(getSafeCallbackUrl(input)).toBe(expected);
  });

  it.each([[null], [""], [undefined], ["   "]])(
    "input kosong %s → /dashboard",
    (input) => {
      expect(getSafeCallbackUrl(input)).toBe("/dashboard");
    },
  );

  it.each([
    ["https://evil.com"],
    ["http://evil.com"],
    ["//evil.com"],
    ["/\\evil.com"],
    ["javascript:alert(1)"],
    ["data:text/html,<script>alert(1)</script>"],
    ["%2F%2Fevil.com"],
    ["/%2Fevil.com"],
    ["//evil.com%2Fpath"],
    ["\\\\evil.com"],
    ["/learn\\evil"],
    ["%E0%A4%A"],
  ])("input jahat %s → /dashboard", (input) => {
    expect(getSafeCallbackUrl(input)).toBe("/dashboard");
  });

  it.each([["/login"], ["/register"], ["/login?callbackURL=/dashboard"]])(
    "path %s → /dashboard (hindari loop)",
    (input) => {
      expect(getSafeCallbackUrl(input)).toBe("/dashboard");
    },
  );

  it("fallback kustom dipakai saat input tidak valid", () => {
    expect(getSafeCallbackUrl("https://evil.com", "/curriculum")).toBe(
      "/curriculum",
    );
    expect(getSafeCallbackUrl(null, "/curriculum")).toBe("/curriculum");
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signSession, verifySession } from "./auth";

describe("Owner Authentication & Session Protection", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SESSION_SECRET: "test-secret-key-that-is-at-least-32-chars-long",
      OWNER_PIN: "1234",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("signs and verifies valid sessions", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signSession({
      authenticated: true,
      issuedAt: now,
      expiresAt: now + 3600,
    });

    const verified = verifySession(token);
    expect(verified).not.toBeNull();
    expect(verified?.authenticated).toBe(true);
  });

  it("rejects tampered session tokens", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signSession({
      authenticated: true,
      issuedAt: now,
      expiresAt: now + 3600,
    });

    const [payload, hmac] = token.split(".");
    // Tamper with payload
    const tamperedPayload = Buffer.from(JSON.stringify({ authenticated: true, issuedAt: now, expiresAt: now + 999999 }))
      .toString("base64url");
    const tamperedToken = `${tamperedPayload}.${hmac}`;

    expect(verifySession(tamperedToken)).toBeNull();
  });

  it("rejects expired session tokens", () => {
    const past = Math.floor(Date.now() / 1000) - 100;
    const token = signSession({
      authenticated: true,
      issuedAt: past - 3600,
      expiresAt: past, // Expired
    });

    expect(verifySession(token)).toBeNull();
  });

  it("rejects garbage tokens", () => {
    expect(verifySession("invalid-token")).toBeNull();
    expect(verifySession("a.b.c")).toBeNull();
    expect(verifySession("")).toBeNull();
  });
});

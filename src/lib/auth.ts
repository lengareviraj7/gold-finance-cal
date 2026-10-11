import crypto from "crypto";
import { cookies } from "next/headers";
import { SessionPayload } from "./types";

const COOKIE_NAME = "sj_owner_session";
const SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

// In-memory brute-force throttle for serverless instances
// Tracks IP/identifier -> { failedAttempts: number, lockedUntil: number }
interface RateLimitEntry {
  failedAttempts: number;
  lockedUntil: number;
}
const loginAttempts = new Map<string, RateLimitEntry>();

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET environment variable on server.");
  }
  return secret;
}

function getOwnerPin(): string {
  const pin = process.env.OWNER_PIN;
  if (!pin) {
    throw new Error("Missing OWNER_PIN environment variable on server.");
  }
  return pin;
}

/**
 * Constant-time string equality check to prevent timing attacks.
 */
function timingSafeEqualStrings(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    // Run dummy comparison to prevent leak via execution time
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Signs payload into a tamper-evident session token.
 */
export function signSession(payload: SessionPayload): string {
  const secret = getSessionSecret();
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto.createHmac("sha256", secret).update(payloadBase64).digest("base64url");
  return `${payloadBase64}.${hmac}`;
}

/**
 * Verifies and decodes a session token.
 */
export function verifySession(token: string): SessionPayload | null {
  try {
    const secret = getSessionSecret();
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadBase64, providedHmac] = parts;
    const expectedHmac = crypto.createHmac("sha256", secret).update(payloadBase64).digest("base64url");

    if (!timingSafeEqualStrings(providedHmac, expectedHmac)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as SessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (!payload.authenticated || payload.expiresAt < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Validates PIN and handles basic rate-limiting.
 */
export function checkLoginPin(enteredPin: string, clientIp: string): { success: boolean; error?: string } {
  const now = Date.now();
  const entry = loginAttempts.get(clientIp);

  if (entry && entry.lockedUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return {
      success: false,
      error: `Too many failed attempts. Please wait ${remainingSeconds} seconds before trying again.`,
    };
  }

  const configuredPin = getOwnerPin();
  const isMatch = timingSafeEqualStrings(enteredPin.trim(), configuredPin.trim());

  if (!isMatch) {
    const currentAttempts = (entry ? entry.failedAttempts : 0) + 1;
    let lockedUntil = 0;
    if (currentAttempts >= 5) {
      // Lock for 60 seconds after 5 failed attempts
      lockedUntil = now + 60 * 1000;
    }
    loginAttempts.set(clientIp, { failedAttempts: currentAttempts, lockedUntil });
    return { success: false, error: "Incorrect owner PIN." };
  }

  // Clear failed attempts on successful login
  loginAttempts.delete(clientIp);
  return { success: true };
}

/**
 * Creates and sets the session cookie in response headers.
 */
export async function createSessionCookie(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    authenticated: true,
    issuedAt: now,
    expiresAt: now + SESSION_EXPIRY_SECONDS,
  };

  const token = signSession(payload);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRY_SECONDS,
  });

  return token;
}

/**
 * Clears the session cookie.
 */
export async function destroySessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Verifies if current request has a valid owner session.
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;
    const session = verifySession(token);
    return session !== null && session.authenticated === true;
  } catch {
    return false;
  }
}

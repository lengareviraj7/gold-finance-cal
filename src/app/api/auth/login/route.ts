import { NextRequest, NextResponse } from "next/server";
import { checkLoginPin, createSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = body?.pin;

    if (!pin || typeof pin !== "string") {
      return NextResponse.json({ error: "PIN is required." }, { status: 400 });
    }

    // Extract client IP for throttling
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    const result = checkLoginPin(pin, ip);

    if (!result.success) {
      const isLocked = result.error?.includes("Too many failed attempts");
      return NextResponse.json(
        { error: result.error || "Invalid PIN" },
        { status: isLocked ? 429 : 401 }
      );
    }

    await createSessionCookie();
    return NextResponse.json({ success: true, message: "Authenticated successfully" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Server error";
    // Check if configuration missing error
    if (msg.includes("Missing OWNER_PIN") || msg.includes("Missing SESSION_SECRET")) {
      return NextResponse.json(
        { error: "Server authentication setup is incomplete. Check environment variables." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Authentication failed. Please try again." }, { status: 500 });
  }
}

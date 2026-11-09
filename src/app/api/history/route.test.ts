import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

describe("History API Route (/api/history)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      MONGODB_URI: "mongodb://localhost:27017/siddheshwar_jewelers_test",
      MONGODB_DB: "siddheshwar_jewelers_test",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("recalculates yearly_compound on the server and saves yearlyBreakdown", async () => {
    const req = new NextRequest("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mortgageDate: "2025-10-01",
        principalRupees: 20000,
        asOfDate: "2026-11-01",
        monthlyRate: 3,
        interestMode: "yearly_compound",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.record.interestMode).toBe("yearly_compound");
    expect(json.record.interestRupees).toBe(8016);
    expect(json.record.totalDueRupees).toBe(28016);
    expect(json.record.yearlyBreakdown).toHaveLength(2);
    expect(json.record.yearlyBreakdown[0].endingAmountRupees).toBe(27200);
    expect(json.record.yearlyBreakdown[1].startingPrincipalRupees).toBe(27200);
  });

  it("rejects invalid interestMode in POST", async () => {
    const req = new NextRequest("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mortgageDate: "2025-10-01",
        principalRupees: 20000,
        asOfDate: "2026-11-01",
        monthlyRate: 3,
        interestMode: "bogus",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns saved records newest first in GET", async () => {
    const getReq = new NextRequest("http://localhost:3000/api/history?limit=10");
    const res = await GET(getReq);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.records)).toBe(true);
    expect(json.records.length).toBeGreaterThanOrEqual(1);
    expect(json.records[0].totalDueRupees).toBe(28016);
  });
});

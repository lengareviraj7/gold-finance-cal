import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { calculateGoldMortgageInterest } from "@/lib/calculator";
import { ObjectId, Filter, Document } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const authorized = await isAuthenticated();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized. Please enter owner PIN." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limitParam = parseInt(searchParams.get("limit") || "50", 10);
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 50 : limitParam), 100);
    const cursor = searchParams.get("cursor"); // ObjectId string for cursor pagination

    const db = await getDatabase();
    const collection = db.collection("mortgage_calculation_history");

    const query: Filter<Document> = {};
    if (cursor && ObjectId.isValid(cursor)) {
      query._id = { $lt: new ObjectId(cursor) };
    }

    const docs = await collection
      .find(query)
      .sort({ _id: -1 }) // Since ObjectId is monotonically increasing with timestamp
      .limit(limit + 1)
      .toArray();

    const hasMore = docs.length > limit;
    const recordsToReturn = hasMore ? docs.slice(0, limit) : docs;
    const nextCursor = hasMore && recordsToReturn.length > 0 ? recordsToReturn[recordsToReturn.length - 1]._id.toString() : null;

    const records = recordsToReturn.map((doc) => ({
      _id: doc._id.toString(),
      mortgageDate: doc.mortgageDate,
      asOfDate: doc.asOfDate,
      principalPaise: doc.principalPaise,
      principalRupees: doc.principalRupees,
      monthlyRate: doc.monthlyRate,
      completedMonths: doc.completedMonths,
      remainderDays: doc.remainderDays,
      chargeableMonths: doc.chargeableMonths,
      interestPaise: doc.interestPaise,
      interestRupees: doc.interestRupees,
      totalDuePaise: doc.totalDuePaise,
      totalDueRupees: doc.totalDueRupees,
      elapsedDescription: doc.elapsedDescription,
      ruleVersion: doc.ruleVersion,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({
      records,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching calculation history:", error);
    return NextResponse.json(
      { error: "Failed to load calculation history. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorized = await isAuthenticated();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized. Please enter owner PIN." }, { status: 401 });
    }

    const body = await req.json();
    const { mortgageDate, principalRupees, asOfDate, monthlyRate } = body || {};

    if (!mortgageDate || typeof mortgageDate !== "string") {
      return NextResponse.json({ error: "Mortgage date is required." }, { status: 400 });
    }

    if (!principalRupees || typeof principalRupees !== "number" || principalRupees <= 0) {
      return NextResponse.json(
        { error: "Principal amount must be a number strictly greater than 0." },
        { status: 400 }
      );
    }

    if (!asOfDate || typeof asOfDate !== "string") {
      return NextResponse.json({ error: "As-of date is required." }, { status: 400 });
    }

    // CRITICAL: Always re-calculate on the server to prevent client tampering
    const calculated = calculateGoldMortgageInterest({
      mortgageDate,
      principalRupees,
      asOfDate,
      monthlyRate: typeof monthlyRate === "number" && monthlyRate >= 0 ? monthlyRate : undefined,
    });

    const now = new Date();
    const docToInsert = {
      mortgageDate: calculated.mortgageDate,
      asOfDate: calculated.asOfDate,
      principalPaise: calculated.principalPaise,
      principalRupees: calculated.principalRupees,
      monthlyRate: calculated.monthlyRate,
      completedMonths: calculated.completedMonths,
      remainderDays: calculated.remainderDays,
      chargeableMonths: calculated.chargeableMonths,
      interestPaise: calculated.interestPaise,
      interestRupees: calculated.interestRupees,
      totalDuePaise: calculated.totalDuePaise,
      totalDueRupees: calculated.totalDueRupees,
      elapsedDescription: calculated.elapsedDescription,
      ruleVersion: calculated.ruleVersion,
      createdAt: now,
    };

    const db = await getDatabase();
    const collection = db.collection("mortgage_calculation_history");
    const result = await collection.insertOne(docToInsert);

    const savedRecord = {
      _id: result.insertedId.toString(),
      ...docToInsert,
      createdAt: now.toISOString(),
    };

    return NextResponse.json({ success: true, record: savedRecord }, { status: 201 });
  } catch (error) {
    console.error("Error saving calculation:", error);
    const msg = error instanceof Error ? error.message : "Failed to save calculation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

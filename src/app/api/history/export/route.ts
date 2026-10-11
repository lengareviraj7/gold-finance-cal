import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET() {
  try {
    const authorized = await isAuthenticated();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();
    const collection = db.collection("mortgage_calculation_history");

    const records = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(10000)
      .toArray();

    const headers = [
      "Calculation ID",
      "Mortgage Date",
      "As Of Date",
      "Principal (₹)",
      "Monthly Rate (%)",
      "Completed Months",
      "Remainder Days",
      "Chargeable Months",
      "Interest (₹)",
      "Total Due (₹)",
      "Elapsed Period",
      "Rule Version",
      "Saved At (UTC)",
    ];

    const rows: string[] = [headers.map(escapeCsvCell).join(",")];

    for (const rec of records) {
      const row = [
        rec._id.toString(),
        rec.mortgageDate,
        rec.asOfDate,
        (rec.principalRupees ?? (rec.principalPaise / 100)).toFixed(2),
        rec.monthlyRate ?? 2,
        rec.completedMonths,
        rec.remainderDays,
        rec.chargeableMonths,
        (rec.interestRupees ?? (rec.interestPaise / 100)).toFixed(2),
        (rec.totalDueRupees ?? (rec.totalDuePaise / 100)).toFixed(2),
        rec.elapsedDescription,
        rec.ruleVersion,
        rec.createdAt instanceof Date ? rec.createdAt.toISOString() : String(rec.createdAt),
      ];
      rows.push(row.map(escapeCsvCell).join(","));
    }

    const csvContent = rows.join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="siddheshwar-jewelers-mortgage-history-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error generating CSV export:", error);
    return NextResponse.json({ error: "Failed to export CSV." }, { status: 500 });
  }
}

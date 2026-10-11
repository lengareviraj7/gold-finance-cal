import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authorized = await isAuthenticated();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized. Please enter owner PIN." }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid record ID." }, { status: 400 });
    }

    const db = await getDatabase();
    const collection = db.collection("mortgage_calculation_history");

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Record deleted successfully." });
  } catch (error) {
    console.error("Error deleting history record:", error);
    return NextResponse.json(
      { error: "Failed to delete record. Please try again." },
      { status: 500 }
    );
  }
}

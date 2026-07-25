import { NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { instances } from "@/db/schema";
import { eq } from "drizzle-orm";

initDatabase();

export async function GET() {
  try {
    const list = await db.select().from(instances);
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch instance configs", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, baseUrl, apiKey, isDefault } = body;

    if (!name || !baseUrl) {
      return NextResponse.json(
        { error: "Name and Base URL are required" },
        { status: 400 }
      );
    }

    const id = `inst-${Date.now()}`;
    const now = new Date().toISOString();

    if (isDefault) {
      // Unset previous defaults
      await db.update(instances).set({ isDefault: false });
    }

    const newInst = {
      id,
      name,
      baseUrl: baseUrl.replace(/\/$/, ""),
      apiKey: apiKey || null,
      isDefault: Boolean(isDefault),
      status: "unknown",
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(instances).values(newInst);

    return NextResponse.json(newInst, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create instance config", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Instance ID is required" }, { status: 400 });
    }

    await db.delete(instances).where(eq(instances.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete instance config", details: String(error) },
      { status: 500 }
    );
  }
}

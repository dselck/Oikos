import { NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { savedSessions } from "@/db/schema";
import { eq } from "drizzle-orm";

initDatabase();

export async function GET() {
  try {
    const list = await db.select().from(savedSessions);
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch saved sessions from database", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { instanceId, agentId, title, metadata } = body;

    if (!instanceId || !agentId || !title) {
      return NextResponse.json({ error: "Instance ID, Agent ID, and Title are required" }, { status: 400 });
    }

    const id = body.id || `sess-${Date.now()}`;
    const now = new Date().toISOString();

    const newSession = {
      id,
      instanceId,
      agentId,
      title,
      metadataJson: JSON.stringify(metadata || {}),
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(savedSessions).values(newSession);
    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save session in database", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    await db.delete(savedSessions).where(eq(savedSessions.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete session from database", details: String(error) },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { agnoKnowledgeBases } from "@/db/schema";
import { eq } from "drizzle-orm";

initDatabase();

export async function GET() {
  try {
    const list = await db.select().from(agnoKnowledgeBases);
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch knowledge bases from database", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, vectorDbType, tableOrCollection, embedderModel } = body;

    if (!name || !tableOrCollection) {
      return NextResponse.json(
        { error: "Knowledge base name and collection/table name are required" },
        { status: 400 }
      );
    }

    const id = body.id || `kb-${Date.now()}`;
    const now = new Date().toISOString();

    const newKb = {
      id,
      name,
      description: description || "",
      vectorDbType: vectorDbType || "sqlite_vec",
      tableOrCollection,
      embedderModel: embedderModel || "text-embedding-3-small",
      documentCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(agnoKnowledgeBases).values(newKb);
    return NextResponse.json(newKb, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create knowledge base in database", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Knowledge base ID is required" }, { status: 400 });
    }

    await db.delete(agnoKnowledgeBases).where(eq(agnoKnowledgeBases.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete knowledge base from database", details: String(error) },
      { status: 500 }
    );
  }
}

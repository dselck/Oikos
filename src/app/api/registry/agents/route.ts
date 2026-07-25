import { NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { agnoAgents } from "@/db/schema";
import { eq } from "drizzle-orm";

initDatabase();

export async function GET() {
  try {
    const list = await db.select().from(agnoAgents);
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch Agno agents from registry", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      modelProvider,
      modelName,
      instructions,
      systemPrompt,
      tools,
      knowledgeBaseId,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Agent name is required" }, { status: 400 });
    }

    const id = body.id || `agent-${Date.now()}`;
    const now = new Date().toISOString();

    const newAgent = {
      id,
      name,
      description: description || "",
      modelProvider: modelProvider || "openai",
      modelName: modelName || "gpt-4o",
      instructionsJson: JSON.stringify(instructions || []),
      systemPrompt: systemPrompt || "",
      toolsJson: JSON.stringify(tools || []),
      knowledgeBaseId: knowledgeBaseId || null,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(agnoAgents).values(newAgent);
    return NextResponse.json(newAgent, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create Agno agent in registry", details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, description, modelProvider, modelName, instructions, systemPrompt, tools } = body;

    if (!id) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    await db
      .update(agnoAgents)
      .set({
        name,
        description,
        modelProvider,
        modelName,
        instructionsJson: JSON.stringify(instructions || []),
        systemPrompt,
        toolsJson: JSON.stringify(tools || []),
        updatedAt: now,
      })
      .where(eq(agnoAgents.id, id));

    const updated = await db.select().from(agnoAgents).where(eq(agnoAgents.id, id)).limit(1);
    return NextResponse.json(updated[0]);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update Agno agent in registry", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    await db.delete(agnoAgents).where(eq(agnoAgents.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete Agno agent from registry", details: String(error) },
      { status: 500 }
    );
  }
}

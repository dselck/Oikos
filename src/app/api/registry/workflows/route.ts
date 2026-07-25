import { NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { agnoWorkflows } from "@/db/schema";
import { eq } from "drizzle-orm";

initDatabase();

export async function GET() {
  try {
    const list = await db.select().from(agnoWorkflows);
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch Agno workflows from registry", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, steps, sessionState } = body;

    if (!name || !steps) {
      return NextResponse.json({ error: "Workflow name and steps are required" }, { status: 400 });
    }

    const id = body.id || `wf-${Date.now()}`;
    const now = new Date().toISOString();

    const newWorkflow = {
      id,
      name,
      description: description || "",
      stepsJson: JSON.stringify(steps || []),
      sessionStateJson: JSON.stringify(sessionState || {}),
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(agnoWorkflows).values(newWorkflow);
    return NextResponse.json(newWorkflow, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create Agno workflow in registry", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Workflow ID is required" }, { status: 400 });
    }

    await db.delete(agnoWorkflows).where(eq(agnoWorkflows.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete Agno workflow from registry", details: String(error) },
      { status: 500 }
    );
  }
}

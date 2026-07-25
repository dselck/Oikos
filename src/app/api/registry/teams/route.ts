import { NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { agnoTeams } from "@/db/schema";
import { eq } from "drizzle-orm";

initDatabase();

export async function GET() {
  try {
    const list = await db.select().from(agnoTeams);
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch Agno teams from registry", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, leaderAgentId, memberAgentIds, executionMode, instructions } = body;

    if (!name || !leaderAgentId) {
      return NextResponse.json({ error: "Team name and Leader Agent ID are required" }, { status: 400 });
    }

    const id = body.id || `team-${Date.now()}`;
    const now = new Date().toISOString();

    const newTeam = {
      id,
      name,
      description: description || "",
      leaderAgentId,
      memberAgentIdsJson: JSON.stringify(memberAgentIds || []),
      executionMode: executionMode || "hierarchical",
      instructionsJson: JSON.stringify(instructions || []),
      sharedMemory: true,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(agnoTeams).values(newTeam);
    return NextResponse.json(newTeam, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create Agno team in registry", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
    }

    await db.delete(agnoTeams).where(eq(agnoTeams.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete Agno team from registry", details: String(error) },
      { status: 500 }
    );
  }
}

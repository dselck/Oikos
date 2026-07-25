import { NextResponse } from "next/server";
import { db } from "@/db";
import { instances } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getTargetInstance(req: Request) {
  const instanceId = req.headers.get("x-instance-id");
  if (!instanceId) return null;
  const match = await db.select().from(instances).where(eq(instances.id, instanceId)).limit(1);
  return match[0] || null;
}

export async function GET(req: Request) {
  try {
    const target = await getTargetInstance(req);
    if (!target) {
      return NextResponse.json([], { status: 200 });
    }

    const res = await fetch(`${target.baseUrl}/v1/teams`, {
      headers: target.apiKey ? { Authorization: `Bearer ${target.apiKey}` } : {},
    });

    if (!res.ok) {
      return NextResponse.json([], { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const target = await getTargetInstance(req);
    if (!target) {
      return NextResponse.json({ error: "No active AgentOS instance specified" }, { status: 400 });
    }

    const body = await req.json();
    const res = await fetch(`${target.baseUrl}/v1/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(target.apiKey ? { Authorization: `Bearer ${target.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

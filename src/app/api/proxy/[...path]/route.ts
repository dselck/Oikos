import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { instances } from "@/db/schema";
import { eq } from "drizzle-orm";

initDatabase();

async function getTargetInstance(req: NextRequest) {
  const instanceId = req.headers.get("x-instance-id");
  let target;

  if (instanceId) {
    const found = await db.select().from(instances).where(eq(instances.id, instanceId)).limit(1);
    if (found.length > 0) target = found[0];
  }

  if (!target) {
    const defaultInst = await db.select().from(instances).where(eq(instances.isDefault, true)).limit(1);
    if (defaultInst.length > 0) target = defaultInst[0];
  }

  if (!target) {
    const all = await db.select().from(instances).limit(1);
    if (all.length > 0) target = all[0];
  }

  return target;
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, context);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, context);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, context);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, context);
}

async function handleProxy(req: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const resolvedParams = await context.params;
  const path = resolvedParams?.path;
  const targetInstance = await getTargetInstance(req);

  if (!targetInstance) {
    return NextResponse.json(
      { error: "No configured AgentOS instance found" },
      { status: 502 }
    );
  }

  const targetPath = Array.isArray(path) ? path.join("/") : "";
  const targetUrl = `${targetInstance.baseUrl}/${targetPath}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("x-instance-id");

  if (targetInstance.apiKey) {
    headers.set("Authorization", `Bearer ${targetInstance.apiKey}`);
    headers.set("x-api-key", targetInstance.apiKey);
  }

  try {
    const body = req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      // @ts-expect-error - duplex option required for streaming requests in fetch
      duplex: "half",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to connect to AgentOS at ${targetInstance.baseUrl}`, details: String(error) },
      { status: 504 }
    );
  }
}

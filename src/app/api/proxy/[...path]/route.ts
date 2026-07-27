import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { instances } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AuthEngine } from "@/lib/auth-engine";

initDatabase();
const authEngine = new AuthEngine();

export function injectUserIdentity(bodyText: string, userId: string): string {
  try {
    const data = JSON.parse(bodyText);
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      data.user_id = userId;
      return JSON.stringify(data);
    }
  } catch {
    // Preserve non-JSON or invalid strings
  }
  return bodyText;
}

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
  const token =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.headers.get("x-session-token") ||
    req.cookies.get("session_token")?.value;

  const user = await authEngine.validateSession(token);
  if (authEngine.isAuthEnabled() && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const targetUrl = new URL(`${targetInstance.baseUrl}/${targetPath}`);
  targetUrl.search = req.nextUrl.search;
  if (user?.id) {
    targetUrl.searchParams.set("user_id", user.id);
  }

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("x-instance-id");
  headers.delete("content-length");

  if (targetInstance.apiKey) {
    headers.set("Authorization", `Bearer ${targetInstance.apiKey}`);
    headers.set("x-api-key", targetInstance.apiKey);
  }

  try {
    let body: string | undefined = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const rawBody = await req.text();
      if (rawBody && user?.id) {
        body = injectUserIdentity(rawBody, user.id);
      } else {
        body = rawBody;
      }
    }

    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body,
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


import { NextResponse } from "next/server";
import { initDatabase } from "@/db";

export async function handleRegistryAction<T>(
  actionName: string,
  fn: () => Promise<T>,
  successStatus = 200
): Promise<NextResponse> {
  try {
    initDatabase();
    const result = await fn();
    return NextResponse.json(result, { status: successStatus });
  } catch (error) {
    console.error(`Registry Error [${actionName}]:`, error);
    return NextResponse.json(
      { error: `Failed to ${actionName}`, details: String(error) },
      { status: 500 }
    );
  }
}

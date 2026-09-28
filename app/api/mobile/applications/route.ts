import { NextResponse } from "next/server";
import { verifyBearerOrSession } from "@/lib/apiAuth";
import { listApplications } from "@/lib/queries";
import { jsonSafe } from "@/lib/json";

export async function GET(req: Request) {
  const session = await verifyBearerOrSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apps = await listApplications();
  return jsonSafe({ applications: apps });
}

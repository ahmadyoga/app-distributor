import { NextResponse } from "next/server";
import { verifyBearerOrSession } from "@/lib/apiAuth";
import { getBuildById } from "@/lib/queries";
import { jsonSafe } from "@/lib/json";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await verifyBearerOrSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const result = await getBuildById(id);
  if (!result) return NextResponse.json({ error: "Build not found" }, { status: 404 });

  return jsonSafe(result);
}

import { NextResponse } from "next/server";
import { verifyBearerOrSession } from "@/lib/apiAuth";
import { getApplicationBySlug } from "@/lib/queries";
import { jsonSafe } from "@/lib/json";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await verifyBearerOrSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await ctx.params;
  const result = await getApplicationBySlug(slug);
  if (!result) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  return jsonSafe(result);
}

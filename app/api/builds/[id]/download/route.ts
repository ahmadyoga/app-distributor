import { prisma } from "@/lib/db";
import { verifyBearerOrSession } from "@/lib/apiAuth";
import { downloadResponse } from "@/lib/storage/downloadResponse";

export async function GET(req: Request, ctx: RouteContext<"/api/builds/[id]/download">) {
  const session = await verifyBearerOrSession(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const build = await prisma.build.findUnique({
    where: { id },
    include: { storageConnection: true },
  });
  if (!build) return Response.json({ error: "Build file not found" }, { status: 404 });
  return downloadResponse(req, build);
}

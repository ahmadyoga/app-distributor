import { prisma } from "@/lib/db";
import { downloadResponse } from "@/lib/storage/downloadResponse";

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const build = await prisma.build.findUnique({
    where: { shareToken: token },
    include: { storageConnection: true },
  });
  if (!build) return Response.json({ error: "Build file not found" }, { status: 404 });
  return downloadResponse(req, build);
}

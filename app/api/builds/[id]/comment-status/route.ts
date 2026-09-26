import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";

const PENDING_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await getCurrentUser();
  const { id } = await params;

  const build = await prisma.build.findUnique({
    where: { id },
    select: { createdAt: true },
  });
  if (!build) return NextResponse.json({ tickets: [], allSettled: true });

  const staleCutoff = new Date(build.createdAt.getTime() + PENDING_TIMEOUT_MS);
  const isStale = new Date() > staleCutoff;

  // If build is old enough and tickets are still PENDING, mark them FAILED
  if (isStale) {
    await prisma.buildTicket.updateMany({
      where: { buildId: id, commentStatus: "PENDING" },
      data: {
        commentStatus: "FAILED",
        commentError: "Timed out — comment was not sent",
      },
    });
  }

  const tickets = await prisma.buildTicket.findMany({
    where: { buildId: id },
    select: {
      id: true,
      repo: true,
      number: true,
      title: true,
      commentStatus: true,
      commentError: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const allSettled = tickets.every((t) => t.commentStatus !== "PENDING");

  return NextResponse.json({ tickets, allSettled });
}

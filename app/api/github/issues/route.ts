import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { searchIssues } from "@/lib/github";

export async function GET(req: NextRequest) {
  await getCurrentUser();
  const repo = req.nextUrl.searchParams.get("repo");
  const query = req.nextUrl.searchParams.get("q") ?? "";
  if (!repo) {
    return NextResponse.json({ error: "repo is required" }, { status: 400 });
  }
  try {
    const issues = await searchIssues(repo, query);
    return NextResponse.json(issues);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

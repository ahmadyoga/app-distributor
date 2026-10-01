import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { searchIssues } from "@/lib/github";
import { getGithubToken, NO_GITHUB_TOKEN_MESSAGE } from "@/lib/githubToken";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const repo = req.nextUrl.searchParams.get("repo");
  const query = req.nextUrl.searchParams.get("q") ?? "";
  if (!repo) {
    return NextResponse.json({ error: "repo is required" }, { status: 400 });
  }
  const token = await getGithubToken(user.id);
  if (!token) {
    return NextResponse.json({ error: NO_GITHUB_TOKEN_MESSAGE, code: "no_token" }, { status: 412 });
  }
  try {
    const issues = await searchIssues(token, repo, query);
    return NextResponse.json(issues);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

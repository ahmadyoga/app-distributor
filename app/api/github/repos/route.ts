import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { listOrgRepos } from "@/lib/github";
import { getGithubToken, NO_GITHUB_TOKEN_MESSAGE } from "@/lib/githubToken";

export async function GET() {
  const user = await getCurrentUser();
  const token = await getGithubToken(user.id);
  if (!token) {
    return NextResponse.json({ error: NO_GITHUB_TOKEN_MESSAGE, code: "no_token" }, { status: 412 });
  }
  try {
    const repos = await listOrgRepos(token);
    return NextResponse.json(repos);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

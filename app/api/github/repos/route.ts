import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { listOrgRepos } from "@/lib/github";

export async function GET() {
  await getCurrentUser();
  try {
    const repos = await listOrgRepos();
    return NextResponse.json(repos);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePublisher } from "@/lib/dal";
import { encryptSecret } from "@/lib/crypto";
import {
  GITHUB_ORG,
  getTokenOwner,
  testCommentPermission,
  type CommentPermissionCheck,
} from "@/lib/github";
import { getGithubToken } from "@/lib/githubToken";

export type GithubTokenState =
  | { kind: "saved"; login: string; test: TestResult }
  | { kind: "tested"; test: TestResult }
  | { kind: "error"; message: string }
  | undefined;

export type TestResult = CommentPermissionCheck;

const ISSUE_URL_RE = new RegExp(`github\\.com/${GITHUB_ORG}/([^/]+)/issues/(\\d+)`, "i");

/** Validates the PAT against GitHub, stores it encrypted, then runs the
 *  comment-permission test so the user sees right away whether it works. */
export async function saveGithubToken(
  _state: GithubTokenState,
  formData: FormData
): Promise<GithubTokenState> {
  const user = await requirePublisher();
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { kind: "error", message: "Paste your token first." };

  const owner = await getTokenOwner(token);
  if (!owner.ok) return { kind: "error", message: owner.message };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      githubTokenEncrypted: encryptSecret(token),
      githubLogin: owner.login,
      githubTokenSetAt: new Date(),
    },
  });

  const test = await testCommentPermission(token);
  revalidatePath("/", "layout");
  return { kind: "saved", login: owner.login, test };
}

/** Dry-runs a comment with the saved token — nothing is posted. */
export async function testGithubToken(
  _state: GithubTokenState,
  formData: FormData
): Promise<GithubTokenState> {
  const user = await requirePublisher();
  const token = await getGithubToken(user.id);
  if (!token) return { kind: "error", message: "No token saved yet." };

  const issueUrl = String(formData.get("issueUrl") ?? "").trim();
  let target: { repo: string; issueNumber: number } | undefined;
  if (issueUrl) {
    const m = issueUrl.match(ISSUE_URL_RE);
    if (!m) {
      return {
        kind: "error",
        message: `Enter a ${GITHUB_ORG} issue URL, e.g. https://github.com/${GITHUB_ORG}/<repo>/issues/123`,
      };
    }
    target = { repo: m[1], issueNumber: Number(m[2]) };
  }

  return { kind: "tested", test: await testCommentPermission(token, target) };
}

export async function removeGithubToken() {
  const user = await requirePublisher();
  await prisma.user.update({
    where: { id: user.id },
    data: { githubTokenEncrypted: null, githubLogin: null, githubTokenSetAt: null },
  });
  revalidatePath("/", "layout");
}

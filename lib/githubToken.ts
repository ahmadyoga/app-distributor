import "server-only";
import { prisma } from "./db";
import { decryptSecret } from "./crypto";

/** The user's own GitHub PAT, decrypted — or null if they haven't set one up. */
export async function getGithubToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubTokenEncrypted: true },
  });
  return user?.githubTokenEncrypted ? decryptSecret(user.githubTokenEncrypted) : null;
}

export const NO_GITHUB_TOKEN_MESSAGE =
  "Set up your GitHub token in Settings before linking issues.";

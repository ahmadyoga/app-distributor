import "server-only";

const ORG = "GO-Bimbel";
const BASE = "https://api.github.com";

export const GITHUB_ORG = ORG;

/** Every call runs as the signed-in publisher's own PAT (see lib/githubToken.ts),
 *  so comments on issues show up under their GitHub account. */
function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export type GithubRepo = {
  name: string;
  fullName: string;
  description: string | null;
};

export type GithubIssue = {
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
  repo: string;
};

export async function listOrgRepos(token: string): Promise<GithubRepo[]> {
  const repos: GithubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `${BASE}/orgs/${ORG}/repos?type=all&sort=pushed&per_page=100&page=${page}`,
      { headers: headers(token), next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = (await res.json()) as Array<{
      name: string;
      full_name: string;
      description: string | null;
      archived: boolean;
    }>;
    if (data.length === 0) break;
    for (const r of data) {
      if (!r.archived) {
        repos.push({ name: r.name, fullName: r.full_name, description: r.description });
      }
    }
    if (data.length < 100) break;
    page++;
  }

  return repos;
}

export async function searchIssues(
  token: string,
  repo: string,
  query: string
): Promise<GithubIssue[]> {
  const trimmed = query.trim().replace(/^#/, "");
  const isNumber = /^\d+$/.test(trimmed);

  if (isNumber) {
    const res = await fetch(
      `${BASE}/repos/${ORG}/${repo}/issues/${trimmed}`,
      { headers: headers(token), next: { revalidate: 0 } }
    );
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = (await res.json()) as {
      number: number;
      title: string;
      state: string;
      html_url: string;
      pull_request?: unknown;
    };
    if (data.pull_request) return [];
    return [
      {
        number: data.number,
        title: data.title,
        state: data.state,
        htmlUrl: data.html_url,
        repo,
      },
    ];
  }

  const q = encodeURIComponent(
    // Empty query lists the most recently updated open issues.
    trimmed
      ? `${trimmed} repo:${ORG}/${repo} is:issue`
      : `repo:${ORG}/${repo} is:issue is:open`
  );
  const res = await fetch(
    `${BASE}/search/issues?q=${q}&per_page=10&sort=updated`,
    { headers: headers(token), next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = (await res.json()) as {
    items: Array<{
      number: number;
      title: string;
      state: string;
      html_url: string;
      pull_request?: unknown;
    }>;
  };

  return data.items
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      state: i.state,
      htmlUrl: i.html_url,
      repo,
    }));
}

export async function postBuildComment({
  token,
  repo,
  issueNumber,
  appName,
  shareUrl,
  buildNumber,
  version,
  feature,
  developerName,
  apkSizeBytes,
}: {
  token: string;
  repo: string;
  issueNumber: number;
  appName: string;
  /** Public /share/[token] link — this is what gets embedded, never the authed build page. */
  shareUrl: string;
  buildNumber: string;
  version: string;
  feature: string;
  developerName: string;
  apkSizeBytes: number;
}): Promise<void> {
  const sizeMb = (apkSizeBytes / 1024 / 1024).toFixed(1);

  const body = [
    `### 🚀 Build Published — ${appName}`,
    ``,
    `| | |`,
    `|---|---|`,
    `| **Build** | \`${buildNumber}\` |`,
    `| **Version** | \`v${version}\` |`,
    `| **Feature** | ${feature} |`,
    `| **Developer** | ${developerName} |`,
    `| **APK size** | ${sizeMb} MB |`,
    ``,
    `[Download APK](${shareUrl})`,
  ].join("\n");

  const res = await fetch(
    `${BASE}/repos/${ORG}/${repo}/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to post comment to ${repo}#${issueNumber}: ${res.status} ${text}`);
  }
}

/** Posted when a build's APK is replaced in place — same build, same link. */
export async function postApkUpdatedComment({
  token,
  repo,
  issueNumber,
  appName,
  shareUrl,
  buildNumber,
  version,
  developerName,
  apkSizeBytes,
  note,
}: {
  token: string;
  repo: string;
  issueNumber: number;
  appName: string;
  /** Null when the share link was revoked — the comment then carries no link. */
  shareUrl: string | null;
  buildNumber: string;
  version: string;
  developerName: string;
  apkSizeBytes: number;
  note: string | null;
}): Promise<void> {
  const sizeMb = (apkSizeBytes / 1024 / 1024).toFixed(1);
  const lines = (note ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const body = [
    `### 🔄 APK Updated — ${appName}`,
    ``,
    `The APK for build \`${buildNumber}\` was replaced. The download link is unchanged.`,
    ``,
    `| | |`,
    `|---|---|`,
    `| **Build** | \`${buildNumber}\` |`,
    `| **Version** | \`v${version}\` |`,
    `| **Updated by** | ${developerName} |`,
    `| **APK size** | ${sizeMb} MB |`,
    ...(lines.length > 0 ? [``, `**What changed**`, ...lines.map((l) => `- ${l}`)] : []),
    ...(shareUrl ? [``, `[Download APK](${shareUrl})`] : []),
  ].join("\n");

  const res = await fetch(
    `${BASE}/repos/${ORG}/${repo}/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to post comment to ${repo}#${issueNumber}: ${res.status} ${text}`);
  }
}

export type TokenCheck =
  | { ok: true; login: string }
  | { ok: false; message: string };

/** Confirms the token authenticates and returns the account it belongs to. */
export async function getTokenOwner(token: string): Promise<TokenCheck> {
  const res = await fetch(`${BASE}/user`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (res.status === 401) {
    return { ok: false, message: "GitHub rejected this token (bad credentials or expired)." };
  }
  if (!res.ok) return { ok: false, message: `GitHub API error: ${res.status}` };
  const data = (await res.json()) as { login: string };
  return { ok: true, login: data.login };
}

export type CommentPermissionCheck =
  | { ok: true; login: string; repo: string; issueNumber: number; issueTitle: string; issueUrl: string }
  | { ok: false; message: string };

/**
 * Checks the token can comment on an issue *without posting anything*: it
 * sends the create-comment request with no body. GitHub authorizes before it
 * validates, so a 422 ("body wasn't supplied") means the comment would have
 * gone through, while 401/403/404 mean it would not.
 *
 * With no issue given, it tries the most recently updated issue in the org
 * that the token can see.
 */
export async function testCommentPermission(
  token: string,
  target?: { repo: string; issueNumber: number }
): Promise<CommentPermissionCheck> {
  const owner = await getTokenOwner(token);
  if (!owner.ok) return owner;

  let repo: string;
  let issueNumber: number;
  let issueTitle: string;

  if (target) {
    const res = await fetch(`${BASE}/repos/${ORG}/${target.repo}/issues/${target.issueNumber}`, {
      headers: headers(token),
      cache: "no-store",
    });
    if (res.status === 403 && res.headers.get("x-github-sso")) return ssoRequired();
    if (res.status === 404 || res.status === 403) {
      return {
        ok: false,
        message: `Issue ${target.repo}#${target.issueNumber} not found, or this token has no access to the ${target.repo} repo.`,
      };
    }
    if (!res.ok) return { ok: false, message: `GitHub API error: ${res.status}` };
    const data = (await res.json()) as { title: string };
    ({ repo, issueNumber } = target);
    issueTitle = data.title;
  } else {
    const q = encodeURIComponent(`org:${ORG} is:issue`);
    const res = await fetch(`${BASE}/search/issues?q=${q}&per_page=1&sort=updated`, {
      headers: headers(token),
      cache: "no-store",
    });
    if (res.status === 403 && res.headers.get("x-github-sso")) return ssoRequired();
    if (!res.ok) return { ok: false, message: `GitHub API error: ${res.status}` };
    const data = (await res.json()) as {
      items: Array<{ number: number; title: string; repository_url: string }>;
    };
    const issue = data.items[0];
    if (!issue) {
      return {
        ok: false,
        message: `This token can't see any issues in ${ORG}. Make sure the token's resource owner is ${ORG} and it has access to the repositories.`,
      };
    }
    repo = issue.repository_url.split("/").pop()!;
    issueNumber = issue.number;
    issueTitle = issue.title;
  }

  const res = await fetch(`${BASE}/repos/${ORG}/${repo}/issues/${issueNumber}/comments`, {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  if (res.status === 422) {
    return {
      ok: true,
      login: owner.login,
      repo,
      issueNumber,
      issueTitle,
      issueUrl: `https://github.com/${ORG}/${repo}/issues/${issueNumber}`,
    };
  }
  if (res.status === 403 && res.headers.get("x-github-sso")) return ssoRequired();
  if (res.status === 403 || res.status === 404) {
    return {
      ok: false,
      message: `The token can read ${repo}#${issueNumber} but can't comment on it. Give it the "Issues: Read and write" permission (fine-grained) or the "repo" scope (classic).`,
    };
  }
  return { ok: false, message: `Unexpected GitHub response: ${res.status}` };
}

function ssoRequired(): CommentPermissionCheck {
  return {
    ok: false,
    message: `${ORG} uses SAML SSO. On github.com/settings/tokens, click "Configure SSO" next to this token and authorize it for ${ORG}.`,
  };
}

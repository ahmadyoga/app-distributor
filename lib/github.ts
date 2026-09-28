import "server-only";
import { absoluteUrl } from "@/lib/url";

const ORG = "GO-Bimbel";
const BASE = "https://api.github.com";

function headers() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
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

export async function listOrgRepos(): Promise<GithubRepo[]> {
  const repos: GithubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `${BASE}/orgs/${ORG}/repos?type=all&sort=pushed&per_page=100&page=${page}`,
      { headers: headers(), next: { revalidate: 300 } }
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
  repo: string,
  query: string
): Promise<GithubIssue[]> {
  const trimmed = query.trim().replace(/^#/, "");
  const isNumber = /^\d+$/.test(trimmed);

  if (isNumber) {
    const res = await fetch(
      `${BASE}/repos/${ORG}/${repo}/issues/${trimmed}`,
      { headers: headers(), next: { revalidate: 0 } }
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
    { headers: headers(), next: { revalidate: 0 } }
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
  repo,
  issueNumber,
  appName,
  appSlug,
  buildId,
  buildNumber,
  version,
  feature,
  developerName,
  apkSizeBytes,
}: {
  repo: string;
  issueNumber: number;
  appName: string;
  appSlug: string;
  buildId: string;
  buildNumber: string;
  version: string;
  feature: string;
  developerName: string;
  apkSizeBytes: number;
}): Promise<void> {
  const sizeMb = (apkSizeBytes / 1024 / 1024).toFixed(1);
  const buildUrl = absoluteUrl(`/apps/${appSlug}/builds/${buildId}`);

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
    `[Download APK](${buildUrl})`,
  ].join("\n");

  const res = await fetch(
    `${BASE}/repos/${ORG}/${repo}/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to post comment to ${repo}#${issueNumber}: ${res.status} ${text}`);
  }
}

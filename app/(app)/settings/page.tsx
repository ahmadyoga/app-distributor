import { getCurrentUser } from "@/lib/dal";
import { GITHUB_ORG } from "@/lib/github";
import { formatDate } from "@/lib/format";
import { GithubTokenPanel } from "@/components/GithubTokenPanel";
import storageStyles from "../storage/storage.module.css";
import styles from "./settings.module.css";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <div className={storageStyles.header}>
        <div>
          <h1 className={storageStyles.title}>GitHub token</h1>
          <p className={storageStyles.subtitle}>
            When you publish a build linked to GitHub issues, BuildApp comments on
            those issues with your own personal access token, so the comment shows
            up under your GitHub account.
          </p>
        </div>
      </div>

      {user.role === "VIEWER" ? (
        <p style={{ marginTop: 20, fontSize: 13, color: "var(--muted)" }}>
          Only publishers upload builds, so viewers don&apos;t need a GitHub token.
        </p>
      ) : (
        <div className={styles.layout}>
          <GithubTokenPanel
            login={user.githubLogin}
            setAt={user.githubTokenSetAt ? formatDate(user.githubTokenSetAt) : null}
            org={GITHUB_ORG}
          />

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>How to create a token</h2>
            <p className={styles.cardSub}>
              Use either option. The token only needs to comment on issues in the{" "}
              <code>{GITHUB_ORG}</code> organization.
            </p>

            <h3 className={styles.optionHead}>Option A: classic token (recommended)</h3>
            <ol className={styles.steps}>
              <li>
                Open{" "}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=BuildApp"
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/settings/tokens/new
                </a>
                .
              </li>
              <li>
                In <strong>Note</strong>, write <code>BuildApp</code> and pick an expiration.
              </li>
              <li>
                Under <strong>Select scopes</strong>, tick <code>repo</code> (the link
                pre-selects it).
              </li>
              <li>
                Click <strong>Generate token</strong> and copy it right away. GitHub only
                shows it once.
              </li>
              <li>
                If {GITHUB_ORG} uses SAML SSO, click <strong>Configure SSO</strong> next to the
                token on{" "}
                <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer">
                  github.com/settings/tokens
                </a>{" "}
                and authorize <code>{GITHUB_ORG}</code>.
              </li>
            </ol>

            <h3 className={styles.optionHead}>Option B: fine-grained token</h3>
            <ol className={styles.steps}>
              <li>
                Open{" "}
                <a
                  href="https://github.com/settings/personal-access-tokens/new"
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/settings/personal-access-tokens/new
                </a>
                , name it <code>BuildApp</code> and set <strong>Resource owner</strong> to{" "}
                <code>{GITHUB_ORG}</code>.
              </li>
              <li>
                Choose <em>All repositories</em>, then set{" "}
                <strong>Repository permissions → Issues</strong> to{" "}
                <code>Read and write</code>.
              </li>
              <li>
                Generate and copy it. If {GITHUB_ORG} requires approval, it works once an org
                admin approves it.
              </li>
            </ol>

            <hr className={styles.divider} />
            <p className={styles.cardSub} style={{ marginBottom: 0 }}>
              Paste the token on the left and save. BuildApp then checks it can comment
              by sending an empty comment request, which GitHub rejects before anything
              is posted. No test comment ever appears on an issue.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

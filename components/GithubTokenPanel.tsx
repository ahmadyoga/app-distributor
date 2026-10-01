"use client";

import { useActionState } from "react";
import {
  saveGithubToken,
  testGithubToken,
  removeGithubToken,
  type GithubTokenState,
  type TestResult,
} from "@/app/actions/github";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { StatusTag } from "@/components/ui/StatusTag";
import { LockIcon } from "@/components/ui/icons";
import styles from "@/app/(app)/settings/settings.module.css";

function TestOutcome({ test }: { test: TestResult }) {
  if (!test.ok) {
    return (
      <div className={[styles.result, styles.resultFail].join(" ")} role="alert">
        Can&apos;t post comments: {test.message}
      </div>
    );
  }
  return (
    <div className={[styles.result, styles.resultOk].join(" ")} role="status">
      Ready. <strong>@{test.login}</strong> can comment on{" "}
      <a href={test.issueUrl} target="_blank" rel="noreferrer">
        {test.repo}#{test.issueNumber}
      </a>{" "}
      ({test.issueTitle}). Nothing was posted.
    </div>
  );
}

function StateMessage({ state }: { state: GithubTokenState }) {
  if (!state) return null;
  if (state.kind === "error") {
    return (
      <div className={[styles.result, styles.resultFail].join(" ")} role="alert">
        {state.message}
      </div>
    );
  }
  return <TestOutcome test={state.test} />;
}

export function GithubTokenPanel({
  login,
  setAt,
  org,
}: {
  login: string | null;
  setAt: string | null;
  org: string;
}) {
  const [saveState, saveAction, saving] = useActionState(saveGithubToken, undefined);
  const [testState, testAction, testing] = useActionState(testGithubToken, undefined);

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Your token</h2>

      <div className={styles.statusRow}>
        {login ? (
          <>
            <StatusTag tone="ok">Connected</StatusTag>
            <span>
              Comments post as <span className={styles.login}>@{login}</span>
              {setAt && (
                <span style={{ color: "var(--muted)" }}>
                  {" "}
                  · saved {setAt}
                </span>
              )}
            </span>
          </>
        ) : (
          <>
            <StatusTag tone="warn">Not set up</StatusTag>
            <span style={{ color: "var(--muted)" }}>
              You need a token before you can upload builds.
            </span>
          </>
        )}
      </div>

      <form action={saveAction} className={styles.stack}>
        <Field
          label={login ? "Replace token" : "Personal access token"}
          hint="Starts with github_pat_ (fine-grained) or ghp_ (classic)."
        >
          <Input
            name="token"
            type="password"
            mono
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="github_pat_…"
          />
        </Field>
        <div className={styles.actions}>
          <Button type="submit" variant="primary" size="md" disabled={saving} aria-busy={saving}>
            {saving ? "Checking token…" : "Save and test"}
          </Button>
        </div>
        {saveState?.kind === "saved" && (
          <div className={[styles.result, styles.resultOk].join(" ")} role="status">
            Saved token for <strong>@{saveState.login}</strong>.
          </div>
        )}
        <StateMessage state={saveState} />
      </form>

      <div className={styles.note} style={{ marginTop: 14 }}>
        <LockIcon />
        <span>
          Your token is encrypted (AES-256-GCM) before it&apos;s stored, so it never sits in
          the database as plain text and can&apos;t be read by looking at the database. It&apos;s
          never shown again after you save it.
        </span>
      </div>

      {login && (
        <>
          <hr className={styles.divider} />
          <form action={testAction} className={styles.stack}>
            <Field
              label="Test on a specific issue (optional)"
              hint={`Leave empty to test on the most recently updated ${org} issue.`}
            >
              <Input
                name="issueUrl"
                mono
                autoComplete="off"
                placeholder={`https://github.com/${org}/<repo>/issues/123`}
              />
            </Field>
            <div className={styles.actions}>
              <Button type="submit" variant="ghost" size="md" disabled={testing} aria-busy={testing}>
                {testing ? "Testing…" : "Test comment access"}
              </Button>
            </div>
            <StateMessage state={testState} />
          </form>

          <hr className={styles.divider} />
          <form action={removeGithubToken} className={styles.actions}>
            <SubmitButton variant="danger" size="sm" pendingLabel="Removing…">
              Remove token
            </SubmitButton>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              This also stops you from uploading until you add a new one.
            </span>
          </form>
        </>
      )}
    </section>
  );
}

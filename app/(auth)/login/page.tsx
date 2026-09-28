"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Misc";
import { Tile } from "@/components/ui/Tile";
import { StatusTag } from "@/components/ui/StatusTag";
import styles from "../auth.module.css";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.formSide}>
          <Logo />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h1 className={styles.title}>Sign in</h1>
            <p className={styles.subtitle}>
              Publish a build, share one link, keep the version and feature
              attached to it.
            </p>
          </div>
          <form action={action} className={styles.form}>
            <Field label="Work email">
              <Input name="email" type="email" required autoComplete="email" />
            </Field>
            {state?.errors?.email && (
              <p className={styles.fieldErrors}>{state.errors.email[0]}</p>
            )}
            <Field label="Password" hint="At least 8 characters.">
              <Input
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </Field>
            {state?.errors?.password && (
              <p className={styles.fieldErrors}>{state.errors.password[0]}</p>
            )}
            {state?.message && <p className={styles.formError}>{state.message}</p>}
            <div className={styles.actions} style={{ marginTop: 8 }}>
              <Button type="submit" variant="primary" size="lg" block disabled={pending}>
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </div>
          </form>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>
            New team? <Link href="/signup">Create an Account</Link>. You can
            connect storage after signing in.
          </p>
        </div>
        <div className={styles.promoSide}>
          <h2 className={styles.promoHeading}>
            Every APK carries its version, build number, feature and developer.
          </h2>
          <div className={styles.sampleCard}>
            <div className={styles.sampleCardHead}>
              <Tile size="md">GO</Tile>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>GO Expert</div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--muted)",
                  }}
                >
                  v1.8.2 / build 92
                </div>
              </div>
              <StatusTag tone="ok" style={{ marginLeft: "auto" }}>
                Published
              </StatusTag>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Feature</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                Offline Route Cache
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Sari Ningrum, today
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

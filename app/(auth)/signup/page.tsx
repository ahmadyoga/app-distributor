"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Misc";
import styles from "../auth.module.css";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <div className={styles.page}>
      <div className={styles.panel} style={{ gridTemplateColumns: "1fr" }}>
        <div className={styles.formSide} style={{ maxWidth: 440, margin: "0 auto" }}>
          <Logo />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h1 className={styles.title}>Create an Account</h1>
            <p className={styles.subtitle}>
              Your account can publish builds, connect storage, and share
              distribution links.
            </p>
          </div>
          <form action={action} className={styles.form}>
            <Field label="Name">
              <Input name="name" required autoComplete="name" />
            </Field>
            {state?.errors?.name && (
              <p className={styles.fieldErrors}>{state.errors.name[0]}</p>
            )}
            <Field label="Work email">
              <Input name="email" type="email" required autoComplete="email" />
            </Field>
            {state?.errors?.email && (
              <p className={styles.fieldErrors}>{state.errors.email[0]}</p>
            )}
            <Field label="Password" hint="At least 8 characters, with a letter and a number.">
              <Input
                name="password"
                type="password"
                required
                autoComplete="new-password"
              />
            </Field>
            {state?.errors?.password && (
              <p className={styles.fieldErrors}>{state.errors.password[0]}</p>
            )}
            {state?.message && <p className={styles.formError}>{state.message}</p>}
            <div className={styles.actions} style={{ marginTop: 8 }}>
              <Button type="submit" variant="primary" size="lg" block disabled={pending}>
                {pending ? "Creating…" : "Create workspace"}
              </Button>
            </div>
          </form>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>
            Already have an account? <Link href="/login">Sign in</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

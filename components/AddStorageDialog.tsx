"use client";

import { useActionState, useState } from "react";
import { addS3Connection } from "@/app/actions/storage";
import { Button, TextLinkButton } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { OptionCard } from "@/components/ui/Misc";
import styles from "@/app/(app)/storage/storage.module.css";

export function AddStorageDialog({ googleDriveConfigured }: { googleDriveConfigured: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"pick" | "s3form">("pick");
  const [state, action, pending] = useActionState(addS3Connection, undefined);

  function close() {
    setOpen(false);
    setStep("pick");
  }

  return (
    <>
      <Button type="button" variant="primary" size="md" onClick={() => setOpen(true)}>
        Add storage
      </Button>

      {open && (
        <div className={styles.scrim} onClick={close}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            {step === "pick" ? (
              <>
                <h2 className={styles.dialogTitle}>Add storage</h2>
                <p className={styles.dialogSub}>
                  Connect a provider. Multiple accounts per provider are
                  supported.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  <a href="/api/storage/gdrive/oauth/start" style={{ display: "block" }}>
                    <OptionCard
                      title="Google Drive"
                      subtitle={
                        googleDriveConfigured
                          ? "Personal, team or client Drive account"
                          : "Not configured — set GOOGLE_CLIENT_ID / SECRET"
                      }
                    />
                  </a>
                  <OptionCard
                    title="S3-compatible"
                    subtitle="AWS S3, R2, Wasabi, MinIO or any S3 endpoint"
                    onClick={() => setStep("s3form")}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Button type="button" variant="ghost" size="md" onClick={close}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <form action={action}>
                <h2 className={styles.dialogTitle}>Connect S3-compatible storage</h2>
                <p className={styles.dialogSub}>
                  Access key, region and bucket for your own bucket. Nothing
                  is shared with anyone else.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                  <Field label="Connection name">
                    <Input name="name" placeholder="Build Storage" required />
                  </Field>
                  <Field label="Access key ID">
                    <Input name="accessKeyId" mono required />
                  </Field>
                  <Field label="Secret access key">
                    <Input name="secretAccessKey" type="password" mono required />
                  </Field>
                  <Field label="Region">
                    <Input name="region" mono placeholder="eu-central-1" required />
                  </Field>
                  <Field label="Bucket">
                    <Input name="bucket" mono required />
                  </Field>
                  <Field
                    label={
                      <>
                        Endpoint{" "}
                        <span style={{ fontWeight: 400, color: "var(--muted)" }}>
                          optional — for R2/MinIO/etc
                        </span>
                      </>
                    }
                  >
                    <Input name="endpoint" mono placeholder="https://…" />
                  </Field>
                </div>
                {state?.message && (
                  <p style={{ fontSize: 13, color: "var(--danger)", marginBottom: 12 }}>
                    {state.message}
                  </p>
                )}
                {state?.errors && (
                  <p style={{ fontSize: 13, color: "var(--danger)", marginBottom: 12 }}>
                    {Object.values(state.errors)[0]?.[0]}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <TextLinkButton type="button" onClick={() => setStep("pick")}>
                    Back
                  </TextLinkButton>
                  <Button type="button" variant="ghost" size="md" onClick={close}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="md" disabled={pending}>
                    {pending ? "Connecting…" : "Connect account"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

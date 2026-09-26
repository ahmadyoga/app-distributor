"use client";

import { useRef, useTransition } from "react";
import { setApplicationStorage } from "@/app/actions/storage";

export function AppStorageSelect({
  applicationId,
  currentStorageId,
  options,
}: {
  applicationId: string;
  currentStorageId: string | null;
  options: { id: string; name: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(fd) => startTransition(() => setApplicationStorage(fd))}
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      <select
        name="storageConnectionId"
        defaultValue={currentStorageId ?? ""}
        disabled={pending}
        onChange={() => formRef.current?.requestSubmit()}
        style={{
          height: 30,
          padding: "0 8px",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--r-sm)",
          background: "var(--surface-2)",
          color: "var(--ink)",
          fontFamily: "inherit",
          fontSize: 12,
        }}
      >
        <option value="" disabled>
          Choose storage
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </form>
  );
}

"use client";

import { useState } from "react";
import { deleteBuild } from "@/app/actions/apps";
import { Button } from "@/components/ui/Button";

export function DeleteBuildButton({ buildId }: { buildId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button type="button" variant="danger" size="sm" onClick={() => setConfirming(true)}>
        Delete build
      </Button>
    );
  }

  return (
    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--danger)" }}>Delete permanently?</span>
      <form action={deleteBuild}>
        <input type="hidden" name="id" value={buildId} />
        <Button type="submit" variant="danger" size="sm">
          Yes, delete
        </Button>
      </form>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </span>
  );
}

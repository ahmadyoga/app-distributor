"use client";

import { useState } from "react";
import { generateShareToken } from "@/app/actions/apps";
import { Button, TextLinkButton } from "@/components/ui/Button";

export function ShareBuildButton({
  buildId,
  existingToken,
  link,
}: {
  buildId: string;
  existingToken: string | null;
  link?: boolean;
}) {
  const [hasToken, setHasToken] = useState(existingToken !== null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      const url = await generateShareToken(buildId);
      setHasToken(true);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setLoading(false);
    }
  }

  const label = copied
    ? "Copied"
    : loading
    ? "Generating…"
    : hasToken
    ? "Copy share link"
    : "Share";

  if (link) {
    return (
      <TextLinkButton type="button" onClick={handleShare} disabled={loading}>
        {label}
      </TextLinkButton>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={loading}
      onClick={handleShare}
    >
      {label}
    </Button>
  );
}

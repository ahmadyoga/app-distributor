"use client";

import { useState } from "react";
import { Button, TextLinkButton } from "@/components/ui/Button";

export function CopyButton({
  text,
  variant = "ghost",
  size = "md",
  link,
}: {
  text: string;
  variant?: "ghost" | "primary";
  size?: "sm" | "md" | "lg";
  link?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — no-op
    }
  }

  if (link) {
    return (
      <TextLinkButton type="button" onClick={copy}>
        {copied ? "Copied" : "Copy link"}
      </TextLinkButton>
    );
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={copy}>
      {copied ? "Copied" : "Copy app link"}
    </Button>
  );
}

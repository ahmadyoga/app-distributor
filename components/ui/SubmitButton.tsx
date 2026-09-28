"use client";

import { useFormStatus } from "react-dom";
import { Button, TextLinkButton } from "@/components/ui/Button";

type Props = Omit<React.ComponentProps<typeof Button>, "type"> & {
  /** Label while the surrounding form's server action is running. */
  pendingLabel: string;
  link?: boolean;
};

/** Submit button for a `<form action={serverAction}>` that shows it's working. */
export function SubmitButton({ pendingLabel, link, children, disabled, ...rest }: Props) {
  const { pending } = useFormStatus();
  if (link) {
    return (
      <TextLinkButton type="submit" disabled={disabled || pending} aria-busy={pending}>
        {pending ? pendingLabel : children}
      </TextLinkButton>
    );
  }
  return (
    <Button type="submit" disabled={disabled || pending} aria-busy={pending} {...rest}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

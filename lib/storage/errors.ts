import "server-only";
import type { StorageConnection } from "@prisma/client";
import { DriveAccessRevokedError } from "@/lib/storage/gdrive";

/**
 * A storage failure worded for the person in front of the screen. Server
 * Actions must return this rather than throw: in production React replaces a
 * thrown message with a generic "Minified React error #441".
 */
export function storageErrorMessage(
  err: unknown,
  connection?: Pick<StorageConnection, "accountLabel"> | null
): string {
  if (err instanceof DriveAccessRevokedError) {
    const account = connection?.accountLabel ?? "this Google account";
    return `Google Drive access for ${account} has expired. Reconnect it: Storage → Add storage → Google Drive, and sign in with ${account}. Existing builds keep working once it's reconnected.`;
  }
  return err instanceof Error ? err.message : "Storage request failed.";
}

import { NextResponse } from "next/server";

/** `NextResponse.json` throws on raw BigInt (e.g. `apkSizeBytes`, `usedBytes`) — stringify those first. */
export function jsonSafe(data: unknown, init?: ResponseInit) {
  const safe = JSON.parse(
    JSON.stringify(data, (_key, value) => (typeof value === "bigint" ? value.toString() : value))
  );
  return NextResponse.json(safe, init);
}

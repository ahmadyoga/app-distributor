// Android's binary manifest format (AXML) keeps every string used anywhere in
// the document — including fully-qualified class names referenced by
// <provider>/<activity>/<service> android:name attributes — in a flat string
// pool, encoded as UTF-16LE or UTF-8. A plain substring search on the decoded
// buffer finds known inspector-library package names without real AXML
// parsing. This only catches tools that register a manifest component (true
// for Chucker/Stetho); a purely code-initialized tool leaves no trace here.
const INSPECTOR_SIGNATURES = [
  "chuckerteam.chucker",
  "readystatesoftware.chuck",
  "facebook.stetho",
];

export function detectInspector(manifestBuffer: ArrayBuffer | Uint8Array): boolean {
  const bytes =
    manifestBuffer instanceof Uint8Array ? manifestBuffer : new Uint8Array(manifestBuffer);
  const utf16 = new TextDecoder("utf-16le").decode(bytes);
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  return INSPECTOR_SIGNATURES.some((sig) => utf16.includes(sig) || utf8.includes(sig));
}

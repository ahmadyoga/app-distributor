// Browser-side chunked upload to a Google Drive resumable session.
//
// Sending an APK in one request means any network blip restarts it from 0%.
// Here each chunk is its own request; after a failure Drive is asked how many
// bytes it has persisted and the upload continues from there.
//
// Drive's upload endpoint allows this cross-origin: the preflight accepts
// Content-Range, and the `Range` response header is exposed to the page.

const CHUNK_SIZE = 8 * 1024 * 1024; // must be a multiple of 256 KiB
const MAX_RETRIES = 5;

type ChunkResult =
  | { kind: "incomplete"; nextOffset: number }
  | { kind: "done"; fileId: string }
  | { kind: "retryable"; reason: string }
  | { kind: "fatal"; reason: string };

/** `Range: bytes=0-N` → N + 1 (bytes Drive has persisted); no header → 0. */
function persistedBytes(xhr: XMLHttpRequest) {
  const m = /bytes=0-(\d+)/.exec(xhr.getResponseHeader("Range") ?? "");
  return m ? Number(m[1]) + 1 : 0;
}

function put(
  url: string,
  contentRange: string,
  body: Blob | null,
  contentType: string,
  onProgress?: (loaded: number) => void
): Promise<ChunkResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Range", contentRange);
    if (body) xhr.setRequestHeader("Content-Type", contentType);
    if (onProgress) xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      const s = xhr.status;
      if (s === 200 || s === 201) {
        try {
          resolve({ kind: "done", fileId: (JSON.parse(xhr.responseText) as { id: string }).id });
        } catch {
          resolve({ kind: "fatal", reason: "Drive returned an unreadable response" });
        }
      } else if (s === 308) {
        resolve({ kind: "incomplete", nextOffset: persistedBytes(xhr) });
      } else if (s === 404 || s === 410) {
        resolve({ kind: "fatal", reason: "The upload session expired — start the upload again" });
      } else if (s === 408 || s === 429 || s >= 500) {
        resolve({ kind: "retryable", reason: `Drive responded ${s}` });
      } else {
        resolve({ kind: "fatal", reason: `Upload failed (HTTP ${s})` });
      }
    };
    xhr.onerror = () => resolve({ kind: "retryable", reason: "network error" });
    xhr.ontimeout = () => resolve({ kind: "retryable", reason: "timed out" });
    xhr.send(body);
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function uploadToDriveSession(
  sessionUrl: string,
  file: File,
  contentType: string,
  callbacks: {
    onProgress: (pct: number) => void;
    /** Called before each retry; `null` once an upload resumes successfully. */
    onRetry: (info: { attempt: number; max: number; reason: string } | null) => void;
  }
): Promise<string> {
  const total = file.size;
  let offset = 0;
  let failures = 0;

  while (true) {
    const end = Math.min(offset + CHUNK_SIZE, total);
    const result = await put(
      sessionUrl,
      `bytes ${offset}-${end - 1}/${total}`,
      file.slice(offset, end),
      contentType,
      (loaded) => callbacks.onProgress(Math.round(((offset + loaded) / total) * 100))
    );

    if (result.kind === "done") {
      callbacks.onProgress(100);
      return result.fileId;
    }
    if (result.kind === "fatal") throw new Error(result.reason);
    if (result.kind === "incomplete") {
      offset = result.nextOffset;
      if (failures) callbacks.onRetry(null);
      failures = 0;
      continue;
    }

    // Retryable: back off, then ask Drive where it actually got to.
    failures++;
    if (failures > MAX_RETRIES) {
      throw new Error(`Upload failed after ${MAX_RETRIES} retries (${result.reason})`);
    }
    callbacks.onRetry({ attempt: failures, max: MAX_RETRIES, reason: result.reason });
    await wait(1000 * 2 ** (failures - 1));

    const status = await put(sessionUrl, `bytes */${total}`, null, contentType);
    if (status.kind === "done") {
      callbacks.onProgress(100);
      return status.fileId;
    }
    if (status.kind === "incomplete") offset = status.nextOffset;
    if (status.kind === "fatal") throw new Error(status.reason);
    // If the status check itself failed, loop and resend from the last known offset.
  }
}

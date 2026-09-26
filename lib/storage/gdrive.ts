import "server-only";
import { headers } from "next/headers";
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

function oauthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function isGoogleDriveConfigured() {
  return oauthClient() !== null;
}

export function buildAuthUrl(state: string) {
  const client = oauthClient();
  if (!client) throw new Error("Google Drive OAuth is not configured");
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = oauthClient();
  if (!client) throw new Error("Google Drive OAuth is not configured");
  const { tokens } = await client.getToken(code);
  return tokens;
}

function authorizedClient(refreshToken: string) {
  const client = oauthClient();
  if (!client) throw new Error("Google Drive OAuth is not configured");
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

const UPLOAD_FOLDER_NAME = "distribution";

/** Finds (or creates, on first use) the app's "distribution" folder in the user's Drive. */
async function ensureDistributionFolder(refreshToken: string): Promise<string> {
  const auth = authorizedClient(refreshToken);
  const drive = google.drive({ version: "v3", auth });

  const existing = await drive.files.list({
    q: `name='${UPLOAD_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
    pageSize: 1,
  });
  const found = existing.data.files?.[0]?.id;
  if (found) return found;

  const created = await drive.files.create({
    requestBody: { name: UPLOAD_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });
  if (!created.data.id) throw new Error("Failed to create the Drive distribution folder");
  return created.data.id;
}

/** Opens a resumable upload session; the client PUTs the file bytes directly to the returned URL. */
export async function createResumableUploadSession(
  refreshToken: string,
  filename: string,
  mimeType: string
) {
  const auth = authorizedClient(refreshToken);
  const { token } = await auth.getAccessToken();
  if (!token) throw new Error("Failed to obtain a Google Drive access token");

  const folderId = await ensureDistributionFolder(refreshToken);

  // The client PUTs the file bytes directly to the session URL, which is a
  // cross-origin request to googleapis.com. Google only allows that CORS PUT
  // for the origin that was told to it when the session was opened — so this
  // origin (read from the real incoming request) must match what the browser
  // sends on the PUT, or the browser silently fails the upload as a generic
  // "network error" even though the (empty) file has already been created.
  // https://developers.google.com/workspace/drive/api/guides/manage-uploads#cors-support-for-resumable-uploads
  const hdrs = await headers();
  const origin =
    hdrs.get("origin") ??
    `${hdrs.get("x-forwarded-proto") ?? "http"}://${hdrs.get("host")}`;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        Origin: origin,
      },
      body: JSON.stringify({ name: filename, parents: [folderId] }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to open Drive upload session: ${res.status}`);
  }
  const sessionUrl = res.headers.get("location");
  if (!sessionUrl) throw new Error("Drive did not return an upload session URL");
  return sessionUrl;
}

export type DriveFileSummary = {
  id: string;
  name: string;
  size: number;
  createdTime: string | null;
};

/** Lists every file sitting in the app's "distribution" folder — since the
 *  app only ever uploads there (drive.file scope), everything here is ours. */
export async function listDistributionFolderFiles(
  refreshToken: string
): Promise<DriveFileSummary[]> {
  const auth = authorizedClient(refreshToken);
  const drive = google.drive({ version: "v3", auth });
  const folderId = await ensureDistributionFolder(refreshToken);

  const results: DriveFileSummary[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "nextPageToken, files(id,name,size,createdTime)",
      pageSize: 1000,
      pageToken,
    });
    for (const f of res.data.files ?? []) {
      if (f.id) {
        results.push({
          id: f.id,
          name: f.name ?? f.id,
          size: f.size ? Number(f.size) : 0,
          createdTime: f.createdTime ?? null,
        });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return results;
}

/** Moves a file to Drive's trash (recoverable for ~30 days) rather than
 *  permanently deleting it — safer default for an automated cleanup action. */
export async function trashDriveFile(refreshToken: string, fileId: string) {
  const auth = authorizedClient(refreshToken);
  const drive = google.drive({ version: "v3", auth });
  await drive.files.update({ fileId, requestBody: { trashed: true } });
}

export async function getAccountEmail(refreshToken: string) {
  const auth = authorizedClient(refreshToken);
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.about.get({ fields: "user" });
  return res.data.user?.emailAddress ?? "Google Drive";
}

/** Streams the file's bytes from Drive for proxying back to the browser on download. */
export async function fetchDriveFileStream(refreshToken: string, fileId: string) {
  const auth = authorizedClient(refreshToken);
  const { token } = await auth.getAccessToken();
  if (!token) throw new Error("Failed to obtain a Google Drive access token");

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok || !res.body) {
    throw new Error(`Failed to fetch Drive file: ${res.status}`);
  }
  return res;
}

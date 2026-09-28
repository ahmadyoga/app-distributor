/** Absolute URL on this deployment, from the server-side BASE_URL. */
export function absoluteUrl(path = "") {
  const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

/** Display form of an absolute URL, without the protocol. */
export function displayUrl(path = "") {
  return absoluteUrl(path).replace(/^https?:\/\//, "");
}

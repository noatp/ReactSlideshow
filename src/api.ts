// Resolve API base:
// - If VITE_API_BASE is set to a non-empty, non-"auto" value, use it.
// - Otherwise, build it from the current page's origin but with port 61235.
function resolveApiBase(): string {
  const env = (import.meta.env.VITE_API_BASE as string | undefined)?.trim();
  if (env && env.toLowerCase() !== "auto") return env.replace(/\/+$/, ""); // normalize

  const origin = new URL(window.location.origin); // e.g. http://192.168.4.5:61234
  origin.port = "61235";                            // -> http://192.168.4.5:61235
  return origin.origin;                             // scheme + host + port
}

export const API_BASE = resolveApiBase();

const apiURL = (path: string) => new URL(path, API_BASE).toString();

export type PhotoItem = {
  rel: string;
  w: number;
  h: number;
  orientation: "portrait" | "landscape";
  url: string; // e.g. /file?rel=...
};

export type NextResponse =
  | { ok: true; type: "single"; items: [PhotoItem] }
  | { ok: true; type: "pair";   items: [PhotoItem, PhotoItem] };

export async function getNext(): Promise<NextResponse> {
  const res = await fetch(apiURL("/api/next"), { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /next failed: ${res.status}`);
  return res.json();
}

// Replace leading /file with /api/file, then join to API_BASE
export const toApiUrl = (u: string) =>
  apiURL(u.replace(/^\/file/, "/api/file"));
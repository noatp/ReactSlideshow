const API_BASE = import.meta.env.VITE_API_BASE;

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
  const res = await fetch(`${API_BASE}/api/next`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /next failed: ${res.status}`);
  const data = await res.json();
  console.log("GET /next response:", data); // <--- prints JSON body to browser console
  return data;
}

export const toApiUrl = (u: string) => u.replace(/^\/file/, `${API_BASE}/api/file`);


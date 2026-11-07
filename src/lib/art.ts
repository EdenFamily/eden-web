/** Generated artwork for tokens without an uploaded image: a halo orb in colours derived from the token address. */
const cache = new Map<string, string>();

function seeded(seed: number) {
  let r = seed % 233280;
  return () => (r = (r * 9301 + 49297) % 233280) / 233280;
}

function palette(address: string): [string, string] {
  const h = parseInt(address.slice(2, 8), 16) % 360;
  return [`hsl(${h} 45% 16%)`, `hsl(${h} 80% 78%)`];
}

export function tokenArt(address: string, w: number, h: number): string {
  const key = `${address}:${w}x${h}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  const r = seeded(parseInt(address.slice(-6), 16) || 7);
  const [bg, fg] = palette(address);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const m = Math.max(w, h);
  const blob = (x: number, y: number, rad: number, col: string, a: number) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = a; g.fillStyle = gr; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
  };
  blob(w * (0.15 + r() * 0.3), h * (0.1 + r() * 0.4), m * 0.9, fg, 0.5);
  blob(w * (0.6 + r() * 0.3), h * (0.5 + r() * 0.5), m * 0.7, "#ffffff", 0.16);
  blob(w * r(), h * (0.75 + r() * 0.25), m * 0.6, bg, 0.5);
  const ox = w * (0.38 + r() * 0.24), oy = h * (0.44 + r() * 0.14), or = Math.min(w, h) * (0.2 + r() * 0.08);
  const og = g.createRadialGradient(ox - or * 0.35, oy - or * 0.4, or * 0.05, ox, oy, or);
  og.addColorStop(0, "#ffffff"); og.addColorStop(0.35, fg); og.addColorStop(1, bg);
  g.fillStyle = og; g.beginPath(); g.arc(ox, oy, or, 0, Math.PI * 2); g.fill();
  g.strokeStyle = fg; g.globalAlpha = 0.75; g.lineWidth = Math.max(1, or * 0.06);
  g.beginPath(); g.ellipse(ox, oy - or * 1.12, or * 1.05, or * 0.26, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 22; d[i]! += n; d[i + 1]! += n; d[i + 2]! += n; }
  g.putImageData(id, 0, 0);
  const url = c.toDataURL("image/jpeg", 0.86);
  cache.set(key, url);
  return url;
}

/** The creator's image when it is a usable URL (https or ipfs), else generated art. */
export function imageFor(address: string, logo: string, w: number, h: number): string {
  if (logo.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${logo.slice(7)}`;
  if (/^https:\/\//.test(logo)) return logo;
  return tokenArt(address, w, h);
}

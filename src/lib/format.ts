const WEI = 1e18;

export const fromWei = (raw: string | bigint | null | undefined): number => (raw == null ? 0 : Number(raw) / WEI);

export function usd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e5) return "$" + Math.round(n / 1e3) + "K";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  if (n >= 1) return "$" + n.toFixed(2);
  return "$" + n.toPrecision(3);
}

export const usdFull = (n: number | null | undefined): string =>
  n == null || !Number.isFinite(n) ? "—" : "$" + Math.round(n).toLocaleString("en-US");

export function pct(fraction: number | null | undefined): string {
  if (fraction == null || !Number.isFinite(fraction)) return "—";
  const p = fraction * 100;
  return (p >= 0 ? "+" : "−") + Math.abs(p).toFixed(1) + "%";
}

export function hype(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 100) return n.toFixed(1) + " HYPE";
  if (n >= 1) return n.toFixed(2) + " HYPE";
  return n.toPrecision(3) + " HYPE";
}

export function amount(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(n >= 1 ? 2 : 4);
}

export const short = (addr: string): string => (addr.length > 12 ? addr.slice(0, 6) + "…" + addr.slice(-4) : addr);

export function ago(iso: string | null | undefined): string {
  if (!iso) return "—";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return Math.floor(s) + "s";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

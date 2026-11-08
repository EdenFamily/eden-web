const WEI = 1e18;

export const fromWei = (raw: string | bigint | null | undefined): number => (raw == null ? 0 : Number(raw) / WEI);

export function usd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n === 0) return "$0";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e5) return "$" + Math.round(n / 1e3) + "K";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  if (n >= 1) return "$" + n.toFixed(2);
  return price(n);
}

const SUB = "₀₁₂₃₄₅₆₇₈₉";
/**
 * A token price in dollars. Sub-cent prices count their leading zeros in a subscript, the way traders read meme prices:
 * 0.00000506 → $0.0₅506. Three significant digits.
 */
export function price(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n === 0) return "$0";
  if (n >= 1) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: n >= 1000 ? 0 : 2, minimumFractionDigits: n >= 1000 ? 0 : 2 });
  let zeros = Math.floor(-Math.log10(n)); // 0.00506 → 2
  if (Math.round(n * 10 ** (zeros + 3)) >= 1000) zeros--; // 0.0000099999 rounds up to 0.00001
  if (zeros < 4) return "$" + n.toFixed(zeros + 3);
  const digits = (n * 10 ** (zeros + 3)).toFixed(0).replace(/0+$/, "") || "0";
  return "$0.0" + String(zeros).split("").map((d) => SUB[Number(d)]).join("") + digits;
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

/** "3m ago", or "just now" for the last few seconds. */
export const since = (iso: string | null | undefined): string => { const a = ago(iso); return a === "now" ? "just now" : a === "—" ? a : a + " ago"; };

export function ago(iso: string | null | undefined): string {
  if (!iso) return "—";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5) return "now";
  if (s < 60) return Math.floor(s) + "s";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

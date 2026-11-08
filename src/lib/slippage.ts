import { useSyncExternalStore } from "react";

/** The trader's slippage tolerance in percent, shared by every trade panel and kept across visits. */
const KEY = "eden-slippage";
export const SLIPPAGE_PRESETS = [0.5, 1, 3, 5] as const;
export const DEFAULT_SLIPPAGE = 3;
export const MIN_SLIPPAGE = 0.1, MAX_SLIPPAGE = 50;

const subs = new Set<() => void>();
let value = read();

function read(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    if (v >= MIN_SLIPPAGE && v <= MAX_SLIPPAGE) return v;
  } catch { /* storage unavailable */ }
  return DEFAULT_SLIPPAGE;
}

export function setSlippage(pct: number): void {
  value = Math.min(MAX_SLIPPAGE, Math.max(MIN_SLIPPAGE, Math.round(pct * 10) / 10));
  try { localStorage.setItem(KEY, String(value)); } catch { /* storage unavailable */ }
  subs.forEach((f) => f());
}

export function useSlippage(): number {
  return useSyncExternalStore((s) => (subs.add(s), () => void subs.delete(s)), () => value);
}

/** The least a trader accepts for a quoted `out`: out × (1 − slippage). */
export function minimumOut(out: bigint, pct: number): bigint {
  return (out * BigInt(Math.round((100 - pct) * 100))) / 10_000n;
}

import { useEffect, useState } from "react";
import { api } from "./api";
import { GRADUATION_HYPE, PHANTOM_HYPE } from "./deployment";

/** Market cap at graduation in HYPE for launch config 0: (virtual reserve + raised)² ÷ virtual reserve. */
export const GRADUATION_MCAP_HYPE = (PHANTOM_HYPE + GRADUATION_HYPE) ** 2 / PHANTOM_HYPE;

/** HYPE in USD from the server (one request per page load, shared). */
let price: Promise<number | null> | undefined;
export function useHypeUsd(): number | null {
  const [usd, setUsd] = useState<number | null>(null);
  useEffect(() => {
    price ??= api.stats().then((s) => s.hypeUsd ?? null, () => null);
    let live = true;
    void price.then((v) => { if (live) setUsd(v); });
    return () => { live = false; };
  }, []);
  return usd;
}

/** "≈$72K": the graduation market cap at today's HYPE price, or the last known figure while the price loads. */
export function useGraduationMcapLabel(): string {
  const usd = useHypeUsd();
  const v = (usd ?? 77.29) * GRADUATION_MCAP_HYPE;
  return `≈$${v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : Math.round(v / 1000) + "K"}`;
}

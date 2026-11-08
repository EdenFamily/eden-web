import type { Address } from "viem";
import { curveAbi, publicClient } from "./chain";
import { PHANTOM_HYPE } from "./deployment";

/** Live curve state read from the chain for exact quotes (constant product over the curve's quote and token reserves). */
export type CurveState = { quote: bigint; tokens: bigint; feeBps: bigint; taxBps: bigint };

export async function readCurve(curve: Address): Promise<CurveState> {
  const [[quote, tokens], feeBps, taxBps] = await Promise.all([
    publicClient.readContract({ address: curve, abi: curveAbi, functionName: "getReserves" }),
    publicClient.readContract({ address: curve, abi: curveAbi, functionName: "feeBps" }),
    publicClient.readContract({ address: curve, abi: curveAbi, functionName: "creatorTaxBps" }),
  ]);
  return { quote, tokens, feeBps, taxBps };
}

const BPS = 10_000n;

/** Tokens out for a HYPE amount in: fees come off the input first. */
export function quoteBuy(s: CurveState, quoteIn: bigint): { out: bigint; impactBps: number } {
  const net = (quoteIn * (BPS - s.feeBps - s.taxBps)) / BPS;
  const out = s.tokens - (s.quote * s.tokens) / (s.quote + net);
  const spot = Number(s.quote) / Number(s.tokens), exec = Number(quoteIn) / Math.max(1, Number(out));
  return { out, impactBps: Math.max(0, Math.round((exec / spot - 1) * 10_000)) };
}

/** HYPE out for tokens in: fees come off the output. */
export function quoteSell(s: CurveState, tokensIn: bigint): { out: bigint; impactBps: number } {
  const gross = s.quote - (s.quote * s.tokens) / (s.tokens + tokensIn);
  const out = (gross * (BPS - s.feeBps - s.taxBps)) / BPS;
  const spot = Number(s.quote) / Number(s.tokens), exec = Number(gross) / Math.max(1, Number(tokensIn));
  return { out, impactBps: Math.max(0, Math.round((1 - exec / spot) * 10_000)) };
}

/** Share of supply an initial buy of `hypeIn` gets on a fresh curve (launch config 0 virtual reserve, 1B supply). */
export function initialBuyShare(hypeIn: number, feeBps = 100, taxBps = 0, phantom = PHANTOM_HYPE): number {
  const net = hypeIn * (1 - (feeBps + taxBps) / 10_000);
  return net > 0 ? 1 - phantom / (phantom + net) : 0;
}

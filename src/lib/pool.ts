import { encodeAbiParameters, encodeFunctionData, encodePacked, hexToBigInt, keccak256, maxUint160, parseAbi, toFunctionSelector, zeroAddress, type Address, type Hex } from "viem";
import { contracts, publicClient, UNISWAP } from "./chain";

/**
 * Graduated tokens trade in their Uniswap V4 pool: native HYPE (currency0) against the token, fee 0, tick spacing 200,
 * Eden's hook. The hook takes its fee and the creator tax from the swap's output (afterSwapReturnDelta). Trades go
 * through the Universal Router; sells authorize it with a Permit2 signature inside the same transaction.
 */
export type PoolKey = { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address };
export type PoolState = { sqrtPriceX96: bigint; liquidity: bigint; hookFeeBps: number; creatorTaxBps: number };

const Q96 = 1n << 96n;
const POOLS_SLOT = 6n, LIQUIDITY_OFFSET = 3n;
const keyTuple = { type: "tuple", components: [
  { name: "currency0", type: "address" }, { name: "currency1", type: "address" }, { name: "fee", type: "uint24" },
  { name: "tickSpacing", type: "int24" }, { name: "hooks", type: "address" }] } as const;

export const poolKey = (token: Address): PoolKey => ({ currency0: zeroAddress, currency1: token, fee: 0, tickSpacing: 200, hooks: contracts.memeHook });
export const poolId = (key: PoolKey): Hex => keccak256(encodeAbiParameters([keyTuple], [key]));

const managerAbi = parseAbi(["function extsload(bytes32 slot) view returns (bytes32)"]);
const hookAbi = parseAbi(["function launches(bytes32) view returns (bool registered, bool memecoinIsCurrency0, address memecoin, address quoteToken, address creator, address buybackCreatorRecipient, address protocolFeeRecipient, uint16 creatorTaxBps, uint16 protocolFeeShareBps, uint16 buybackBurnBps, uint16 hookFeeBps, uint16 maxInternalPriceImpactBps, bool buybackEnabled)"]);

/** Price, liquidity (PoolManager storage, as v4's StateLibrary reads it) and the hook's fee for one pool. */
export async function readPool(id: Hex): Promise<PoolState> {
  const state = hexToBigInt(keccak256(encodePacked(["bytes32", "bytes32"], [id, `0x${POOLS_SLOT.toString(16).padStart(64, "0")}`])));
  const slot = (n: bigint) => `0x${n.toString(16).padStart(64, "0")}` as Hex;
  const [slot0, liq, info] = await Promise.all([
    publicClient.readContract({ address: UNISWAP.poolManager, abi: managerAbi, functionName: "extsload", args: [slot(state)] }),
    publicClient.readContract({ address: UNISWAP.poolManager, abi: managerAbi, functionName: "extsload", args: [slot(state + LIQUIDITY_OFFSET)] }),
    publicClient.readContract({ address: contracts.memeHook, abi: hookAbi, functionName: "launches", args: [id] }),
  ]);
  return { sqrtPriceX96: hexToBigInt(slot0) & ((1n << 160n) - 1n), liquidity: hexToBigInt(liq) & ((1n << 128n) - 1n), hookFeeBps: info[10], creatorTaxBps: info[7] };
}

/**
 * Exact-input quote on the pool's full-range liquidity (v4's SqrtPriceMath, fee tier 0), less the hook's cut of
 * the output. `buy` = HYPE in, token out. Other positions in the pool only move the price in the trader's favour
 * or within the slippage they set.
 */
export function quotePool(s: PoolState, side: "buy" | "sell", amountIn: bigint): { out: bigint; impactBps: number } {
  const L = s.liquidity, P = s.sqrtPriceX96;
  if (L === 0n || P === 0n || amountIn === 0n) return { out: 0n, impactBps: 0 };
  let gross: bigint, spotOut: number;
  if (side === "buy") {
    const next = ceilDiv(L * Q96 * P, L * Q96 + amountIn * P);
    gross = (L * (P - next)) / Q96;
    spotOut = Number(amountIn) * Number(P) ** 2 / 2 ** 192;
  } else {
    const next = P + (amountIn * Q96) / L;
    gross = ((L * Q96 * (next - P)) / next) / P;
    spotOut = Number(amountIn) * 2 ** 192 / Number(P) ** 2;
  }
  const out = gross - (gross * BigInt(s.hookFeeBps + s.creatorTaxBps)) / 10_000n;
  return { out, impactBps: Math.max(0, Math.round((1 - Number(gross) / spotOut) * 10_000)) };
}
const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;

/* ---------- Universal Router calldata ---------- */

const V4_SWAP = "10", PERMIT2_PERMIT = "0a";
const ACTIONS = "0x060c0f" as const; // SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL
const routerAbi = parseAbi(["function execute(bytes commands, bytes[] inputs, uint256 deadline) payable"]);
const exactInSingle = { type: "tuple", components: [
  { name: "poolKey", ...keyTuple }, { name: "zeroForOne", type: "bool" }, { name: "amountIn", type: "uint128" },
  { name: "amountOutMinimum", type: "uint128" }, { name: "minHopPriceX36", type: "uint256" }, { name: "hookData", type: "bytes" }] } as const;
const permitSingle = { type: "tuple", components: [
  { name: "details", type: "tuple", components: [{ name: "token", type: "address" }, { name: "amount", type: "uint160" }, { name: "expiration", type: "uint48" }, { name: "nonce", type: "uint48" }] },
  { name: "spender", type: "address" }, { name: "sigDeadline", type: "uint256" }] } as const;

export type Permit = { details: { token: Address; amount: bigint; expiration: number; nonce: number }; spender: Address; sigDeadline: bigint };

/** execute(V4_SWAP) for an exact-input single-pool swap, optionally preceded by PERMIT2_PERMIT. */
export function swapCalldata(key: PoolKey, side: "buy" | "sell", amountIn: bigint, minOut: bigint, deadline: bigint, permit?: { permit: Permit; signature: Hex }): Hex {
  const zeroForOne = side === "buy";
  const [cIn, cOut] = zeroForOne ? [key.currency0, key.currency1] : [key.currency1, key.currency0];
  const params = [
    encodeAbiParameters([exactInSingle], [{ poolKey: key, zeroForOne, amountIn, amountOutMinimum: minOut, minHopPriceX36: 0n, hookData: "0x" }]),
    encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [cIn, amountIn]),
    encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [cOut, minOut]),
  ];
  const swap = encodeAbiParameters([{ type: "bytes" }, { type: "bytes[]" }], [ACTIONS, params]);
  const commands: Hex = `0x${permit ? PERMIT2_PERMIT : ""}${V4_SWAP}`;
  const inputs = permit ? [encodeAbiParameters([permitSingle, { type: "bytes" }], [permit.permit, permit.signature]), swap] : [swap];
  return encodeFunctionData({ abi: routerAbi, functionName: "execute", args: [commands, inputs, deadline] });
}

/* ---------- Permit2 ---------- */

export const permit2Abi = parseAbi(["function allowance(address owner, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)"]);

/** The EIP-712 permit that lets the router spend the token through Permit2: max amount, valid for a year. */
export function permitTyped(permit: Permit, chainId: number) {
  return {
    domain: { name: "Permit2", chainId, verifyingContract: UNISWAP.permit2 },
    types: {
      PermitDetails: [{ name: "token", type: "address" }, { name: "amount", type: "uint160" }, { name: "expiration", type: "uint48" }, { name: "nonce", type: "uint48" }],
      PermitSingle: [{ name: "details", type: "PermitDetails" }, { name: "spender", type: "address" }, { name: "sigDeadline", type: "uint256" }],
    },
    primaryType: "PermitSingle" as const,
    message: permit,
  };
}
export const PERMIT_AMOUNT = maxUint160;
export const PERMIT_SECONDS = 365 * 24 * 3600;

/** Reverts that mean "the price moved past your slippage": nothing was traded. */
export const SLIPPAGE_SELECTORS = ["V4TooLittleReceived(uint256,uint256)", "SlippageExceeded(uint256,uint256)", "InsufficientOutputAmount()"].map((s) => toFunctionSelector(s));

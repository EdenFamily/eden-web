import { createPublicClient, defineChain, http, parseAbi, type Address } from "viem";
import { MAINNET } from "./deployment";
export { UNISWAP } from "./deployment";

const env = import.meta.env;

export const elysium = defineChain({
  id: Number(env.VITE_CHAIN_ID ?? 99901),
  name: "Elysium",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: { default: { http: [env.VITE_RPC_URL ?? "https://rpc-live.elysp.com"] } },
  blockExplorers: env.VITE_EXPLORER_URL ? { default: { name: "Explorer", url: env.VITE_EXPLORER_URL } } : undefined,
});

export const contracts = {
  factory: (env.VITE_FACTORY || MAINNET.factory) as Address,
  launchAndBuy: (env.VITE_LAUNCHANDBUY || MAINNET.launchAndBuy) as Address,
  feeEscrow: (env.VITE_FEEESCROW || MAINNET.feeEscrow) as Address,
  /** the hook every graduated pool is keyed by; a dev chain has its own */
  memeHook: (env.VITE_MEMEHOOK || MAINNET.memeHook) as Address,
};
export const LAUNCH_FEE_WEI = BigInt(env.VITE_LAUNCH_FEE_WEI ?? "500000000000000");

/** Appended to the calldata of every transaction this site builds, so the server can tell Eden trades from others. */
export const EDEN_MARKER = "4544454e0001";

export const publicClient = createPublicClient({ chain: elysium, transport: http() });

export const curveAbi = parseAbi([
  "function getReserves() view returns (uint256 quoteReserve, uint256 tokenReserve)",
  "function feeBps() view returns (uint256)",
  "function creatorTaxBps() view returns (uint256)",
  "function graduated() view returns (bool)",
  "function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) payable returns (uint256)",
  "function sell(uint256 tokensIn, uint256 minQuoteOut, address recipient) returns (uint256)",
]);
export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);
export const escrowAbi = parseAbi(["function claim() returns (uint256)", "function balanceOf(address) view returns (uint256)"]);

const tokenParams = "(string name, string symbol, string logo, string description, (string twitter, string telegram, string discord, string website, string farcaster) socials, address creatorFeeRecipient, uint16 creatorTaxBps, bool buybackEnabled, bytes32 expectedEconomics, bytes32 salt)";
export const factoryAbi = parseAbi([
  `function launchToken(${tokenParams} params, uint256 launchConfigId, address pairToken, address[] snipeTaxExemptions) payable returns (address token, address curve)`,
  "event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)",
]);
export const launchAndBuyAbi = parseAbi([
  `function launchAndBuy(${tokenParams} params, uint256 launchConfigId, address pairToken, uint256 quoteIn, uint256 minTokensOut, address recipient, address[] snipeTaxExemptions) payable returns (address token, address curve, uint256 tokensOut)`,
]);

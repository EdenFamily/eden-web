import { useSyncExternalStore } from "react";
import { createWalletClient, custom, encodeFunctionData, getAddress, numberToHex, type Abi, type Address, type Hex, type WalletClient } from "viem";
import type UniversalProviderT from "@walletconnect/universal-provider";
import { EDEN_MARKER, elysium, publicClient } from "./chain";
import { knownInjected, WC_ICON } from "./wallets-known";

/**
 * Eden's wallet engine, EVM only, no wallet kit:
 * - every installed wallet announces itself (EIP-6963) with its real name and icon, so MetaMask and Rabby side by side
 *   are two choices, each connecting exactly its own provider;
 * - a wallet's in-app browser that only injects window.ethereum gets one fallback option, named when Eden knows it;
 * - WalletConnect (phone wallets by QR or app link) when VITE_WC_PROJECT_ID is set: WalletConnect's own protocol client,
 *   loaded on first use, telemetry off, Eden's own QR sheet.
 */
type Eip1193 = { request(args: { method: string; params?: unknown[] }): Promise<unknown>; on?(e: string, f: (...a: never[]) => void): void; removeListener?(e: string, f: (...a: never[]) => void): void };
export type WalletOption = { id: string; name: string; icon?: string; kind: "injected" | "walletconnect" };

type State = { address?: Address; balance?: bigint; client?: WalletClient; provider?: Eip1193; wrongChain: boolean; wallet?: { name: string; icon?: string; kind: WalletOption["kind"] } };
let state: State = { wrongChain: false };
const subs = new Set<() => void>();
function emit() { subs.forEach((s) => s()); }
function set(patch: Partial<State>) { state = { ...state, ...patch }; emit(); }
export function useWallet(): State { return useSyncExternalStore((s) => (subs.add(s), () => void subs.delete(s)), () => state); }
export const walletState = () => state;

const WC_PROJECT = String(import.meta.env.VITE_WC_PROJECT_ID ?? "").trim();
export const walletConnectEnabled = !!WC_PROJECT;

const announced = new Map<string, WalletOption & { provider: Eip1193 }>();
let optionsCache: WalletOption[] = [];
let optionsVersion = 0;
const optionSubs = new Set<() => void>();
function rebuildOptions() {
  const list: WalletOption[] = [...announced.values()].map(({ id, name, icon, kind }) => ({ id, name, icon, kind }));
  const legacy = (window as unknown as { ethereum?: Eip1193 }).ethereum;
  if (list.length === 0 && legacy) { const k = knownInjected(); list.push({ id: "injected", name: k?.name ?? "Browser wallet", icon: k?.icon, kind: "injected" }); }
  if (WC_PROJECT) list.push({ id: "walletconnect", name: "WalletConnect", icon: WC_ICON, kind: "walletconnect" });
  optionsCache = list; optionsVersion++;
  optionSubs.forEach((s) => s());
}
if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (e) => {
    const d = (e as CustomEvent).detail as { info: { rdns: string; name: string; icon: string }; provider: Eip1193 };
    announced.set(d.info.rdns, { id: d.info.rdns, name: d.info.name, icon: d.info.icon, kind: "injected", provider: d.provider });
    rebuildOptions();
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  rebuildOptions();
}
/** Installed wallets (announced, or the in-app browser's one), then WalletConnect when it is configured. */
export const walletOptions = (): WalletOption[] => optionsCache;
/** The same list, re-rendering when a wallet extension announces itself late. */
export function useWalletOptions(): WalletOption[] {
  useSyncExternalStore((s) => (optionSubs.add(s), () => void optionSubs.delete(s)), () => optionsVersion);
  return optionsCache;
}

/* ---------------------------------------------------------------- WalletConnect */
let wcProvider: UniversalProviderT | undefined;
let wcLoading: Promise<UniversalProviderT> | undefined;
async function walletConnect(): Promise<UniversalProviderT> {
  if (wcProvider) return wcProvider;
  wcLoading ??= (async () => {
    const { UniversalProvider } = await import("@walletconnect/universal-provider");
    const origin = location.origin;
    wcProvider = await UniversalProvider.init({
      projectId: WC_PROJECT, telemetryEnabled: false, logger: "error",
      metadata: { name: "Eden", description: "Every token starts in Eden. The launchpad on Elysium.", url: origin, icons: [`${origin}/icon-192.png`] },
    });
    return wcProvider;
  })();
  try { return await wcLoading; } catch (e) { wcLoading = undefined; throw e; }
}
const wcAccount = (p: UniversalProviderT): Address | undefined => {
  const a = p.session?.namespaces?.eip155?.accounts?.[0]?.split(":")[2];
  return a ? getAddress(a) : undefined;
};
/** Stops waiting for a phone to scan (the QR sheet was closed). */
export function cancelPairing(): void {
  (wcProvider as unknown as { abortPairingAttempt?: () => void } | undefined)?.abortPairingAttempt?.();
}

/* ---------------------------------------------------------------- connect */
async function ensureChain(provider: Eip1193): Promise<boolean> {
  const id = Number(await provider.request({ method: "eth_chainId" }));
  if (id === elysium.id) return true;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: numberToHex(elysium.id) }] });
  } catch {
    await provider.request({ method: "wallet_addEthereumChain", params: [{
      chainId: numberToHex(elysium.id), chainName: "Elysium", nativeCurrency: elysium.nativeCurrency,
      rpcUrls: elysium.rpcUrls.default.http, blockExplorerUrls: elysium.blockExplorers ? [elysium.blockExplorers.default.url] : undefined,
    }] });
  }
  return Number(await provider.request({ method: "eth_chainId" })) === elysium.id;
}

export async function refreshBalance(): Promise<void> {
  if (state.address) set({ balance: await publicClient.getBalance({ address: state.address }) });
}

let unfollow: () => void = () => {};
function adopt(provider: Eip1193, address: Address, option: WalletOption, onChain: boolean) {
  unfollow();
  const client = (a: Address) => createWalletClient({ account: a, chain: elysium, transport: custom(provider) });
  set({ address, client: client(address), provider, wrongChain: !onChain, wallet: { name: option.name, icon: option.icon, kind: option.kind } });
  try { localStorage.setItem("eden-wallet", option.id); } catch { /* storage unavailable */ }
  const accounts = (a: string[]) => {
    const next = a[0];
    if (!next) return void disconnect();
    set({ address: getAddress(next), client: client(getAddress(next)) });
    void refreshBalance();
  };
  const chain = (c: string | number) => set({ wrongChain: Number(c) !== elysium.id });
  const gone = () => void disconnect();
  provider.on?.("accountsChanged", accounts as never);
  provider.on?.("chainChanged", chain as never);
  if (option.kind === "walletconnect") provider.on?.("session_delete", gone as never);
  unfollow = () => {
    provider.removeListener?.("accountsChanged", accounts as never);
    provider.removeListener?.("chainChanged", chain as never);
    provider.removeListener?.("session_delete", gone as never);
  };
}

/**
 * Connects exactly this wallet and asks it to switch to (or add) Elysium. `onUri` receives the WalletConnect pairing
 * link while a phone pairing waits (null when it ends).
 */
export async function connect(option: WalletOption, onUri: (uri: string | null) => void = () => {}): Promise<void> {
  if (option.kind === "walletconnect") {
    const p = await walletConnect();
    if (!p.session) {
      const show = (uri: string) => onUri(uri);
      p.on("display_uri", show);
      try {
        await p.connect({ optionalNamespaces: { eip155: {
          methods: ["eth_sendTransaction", "personal_sign", "eth_signTypedData_v4", "wallet_switchEthereumChain", "wallet_addEthereumChain"],
          events: ["chainChanged", "accountsChanged"], chains: [`eip155:${elysium.id}`],
          rpcMap: { [elysium.id]: elysium.rpcUrls.default.http[0]! }, defaultChain: `eip155:${elysium.id}`,
        } } });
      } finally { p.off("display_uri", show); onUri(null); }
    }
    const address = wcAccount(p);
    if (!address) throw new Error("The wallet app did not share an account.");
    const provider = p as unknown as Eip1193;
    const onChain = await ensureChain(provider).catch(() => false);
    adopt(provider, address, option, onChain);
  } else {
    const provider = announced.get(option.id)?.provider ?? (window as unknown as { ethereum?: Eip1193 }).ethereum;
    if (!provider) throw new Error("That wallet is no longer available. Reload the page and try again.");
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    if (!accounts[0]) throw new Error("The wallet did not share an account.");
    const onChain = await ensureChain(provider).catch(() => false);
    adopt(provider, getAddress(accounts[0]), option, onChain);
  }
  await refreshBalance();
}

export function disconnect(): void {
  unfollow(); unfollow = () => {};
  if (state.wallet?.kind === "walletconnect" && wcProvider?.session) void wcProvider.disconnect().catch(() => undefined);
  set({ address: undefined, balance: undefined, client: undefined, provider: undefined, wrongChain: false, wallet: undefined });
  try { localStorage.removeItem("eden-wallet"); } catch { /* storage unavailable */ }
}

export async function switchToElysium(): Promise<void> {
  if (state.provider) set({ wrongChain: !(await ensureChain(state.provider).catch(() => false)) });
}

/** Sends a contract call with Eden's marker appended, waits for the receipt, and refreshes the balance. */
export async function send<A extends Abi>(to: Address, abi: A, functionName: string, args: readonly unknown[], value?: bigint) {
  return sendData(to, encodeFunctionData({ abi, functionName, args } as Parameters<typeof encodeFunctionData>[0]), value);
}

/**
 * Sends prepared calldata (Eden's marker appended), waits for the receipt, and refreshes the balance. The call is
 * simulated first, so a transaction that would revert (a price that moved past the slippage) fails here, before the
 * wallet opens and before any gas is spent.
 */
export async function sendData(to: Address, calldata: Hex, value?: bigint) {
  const { client, address } = state;
  if (!client || !address) throw new Error("Connect a wallet first.");
  if (state.wrongChain) await switchToElysium();
  if (state.wrongChain) throw new Error("Switch your wallet to Elysium first.");
  const data = (calldata + EDEN_MARKER) as Hex;
  await publicClient.call({ account: address, to, data, value });
  const hash = await client.sendTransaction({ account: address, chain: elysium, to, data, value });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  await refreshBalance();
  if (receipt.status !== "success") throw new Error("The transaction reverted on chain. Nothing was spent except gas.");
  return receipt;
}

export async function signMessage(message: string): Promise<Hex> {
  const { client, address } = state;
  if (!client || !address) throw new Error("Connect a wallet first.");
  return client.signMessage({ account: address, message });
}

/** EIP-712 signature (a Permit2 permit): no transaction, no gas. */
export async function signTypedData(typed: Omit<Parameters<WalletClient["signTypedData"]>[0], "account">): Promise<Hex> {
  const { client, address } = state;
  if (!client || !address) throw new Error("Connect a wallet first.");
  if (state.wrongChain) await switchToElysium();
  return client.signTypedData({ ...typed, account: address } as Parameters<WalletClient["signTypedData"]>[0]);
}

/** Reconnects silently to the last wallet if it still trusts Eden (no popup). */
export async function restore(): Promise<void> {
  let id: string | null = null;
  try { id = localStorage.getItem("eden-wallet"); } catch { /* storage unavailable */ }
  if (!id) return;
  await new Promise((r) => setTimeout(r, 300));
  const option = walletOptions().find((o) => o.id === id);
  if (!option) return;
  if (option.kind === "walletconnect") {
    const p = await walletConnect().catch(() => undefined);
    if (p && wcAccount(p)) await connect(option).catch(() => undefined);
    return;
  }
  const provider = announced.get(option.id)?.provider ?? (window as unknown as { ethereum?: Eip1193 }).ethereum;
  const accounts = (await provider?.request({ method: "eth_accounts" }).catch(() => [])) as string[] | undefined;
  if (accounts?.length) await connect(option).catch(() => undefined);
}

/** The wallet used last on this browser (for the "Recent" tag). */
export function lastWalletId(): string | null {
  try { return localStorage.getItem("eden-wallet-last"); } catch { return null; }
}
export function rememberLast(id: string): void {
  try { localStorage.setItem("eden-wallet-last", id); } catch { /* storage unavailable */ }
}

/** A short, human message for a wallet error (rejections, a request already open). */
export function walletError(e: unknown): string {
  const err = e as { code?: number; message?: string; cause?: { code?: number } };
  const code = err.code ?? err.cause?.code;
  if (code === 4001 || /reject|denied|cancel/i.test(err.message ?? "")) return "You cancelled the request in your wallet.";
  if (code === -32002) return "Your wallet already has a request open. Open the wallet and finish or close it.";
  return (err.message ?? "Something went wrong.").split("\n")[0]!;
}

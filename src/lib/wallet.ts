import { useSyncExternalStore } from "react";
import { createWalletClient, custom, encodeFunctionData, getAddress, numberToHex, type Abi, type Address, type Hex, type WalletClient } from "viem";
import { EDEN_MARKER, elysium, publicClient } from "./chain";

/** Injected wallets (MetaMask, Rabby…) found through EIP-6963, with window.ethereum as the fallback. */
type Eip1193 = { request(args: { method: string; params?: unknown[] }): Promise<unknown>; on?(e: string, f: (...a: unknown[]) => void): void };
export type WalletOption = { id: string; name: string; icon?: string; provider: Eip1193 };

type State = { address?: Address; balance?: bigint; client?: WalletClient; provider?: Eip1193; wrongChain: boolean };
let state: State = { wrongChain: false };
const subs = new Set<() => void>();
function emit() { subs.forEach((s) => s()); }

const found = new Map<string, WalletOption>();
if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (e) => {
    const d = (e as CustomEvent).detail as { info: { rdns: string; name: string; icon: string }; provider: Eip1193 };
    found.set(d.info.rdns, { id: d.info.rdns, name: d.info.name, icon: d.info.icon, provider: d.provider });
    emit();
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function walletOptions(): WalletOption[] {
  const list = [...found.values()];
  const legacy = (window as unknown as { ethereum?: Eip1193 }).ethereum;
  if (list.length === 0 && legacy) list.push({ id: "injected", name: "Browser wallet", provider: legacy });
  return list;
}

function set(patch: Partial<State>) { state = { ...state, ...patch }; emit(); }
export function useWallet(): State { return useSyncExternalStore((s) => (subs.add(s), () => void subs.delete(s)), () => state); }
export const walletState = () => state;

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

export async function connect(option: WalletOption): Promise<void> {
  const accounts = (await option.provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = getAddress(accounts[0]!);
  const onChain = await ensureChain(option.provider);
  const client = createWalletClient({ account: address, chain: elysium, transport: custom(option.provider) });
  set({ address, client, provider: option.provider, wrongChain: !onChain });
  try { localStorage.setItem("eden-wallet", option.id); } catch { /* storage unavailable */ }
  option.provider.on?.("accountsChanged", (a) => {
    const next = (a as string[])[0];
    if (!next) disconnect(); else set({ address: getAddress(next), client: createWalletClient({ account: getAddress(next), chain: elysium, transport: custom(option.provider) }) });
    void refreshBalance();
  });
  option.provider.on?.("chainChanged", (c) => set({ wrongChain: Number(c) !== elysium.id }));
  await refreshBalance();
}

export function disconnect(): void {
  set({ address: undefined, balance: undefined, client: undefined, provider: undefined, wrongChain: false });
  try { localStorage.removeItem("eden-wallet"); } catch { /* storage unavailable */ }
}

export async function switchToElysium(): Promise<void> {
  if (state.provider) set({ wrongChain: !(await ensureChain(state.provider)) });
}

/** Sends a contract call with Eden's marker appended, waits for the receipt, and refreshes the balance. */
export async function send<A extends Abi>(to: Address, abi: A, functionName: string, args: readonly unknown[], value?: bigint) {
  const { client, address } = state;
  if (!client || !address) throw new Error("Connect a wallet first.");
  const data = (encodeFunctionData({ abi, functionName, args } as Parameters<typeof encodeFunctionData>[0]) + EDEN_MARKER) as Hex;
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

/** Reconnects silently to the last wallet if it is still authorised. */
export async function restore(): Promise<void> {
  let id: string | null = null;
  try { id = localStorage.getItem("eden-wallet"); } catch { /* storage unavailable */ }
  if (!id) return;
  await new Promise((r) => setTimeout(r, 300));
  const option = walletOptions().find((o) => o.id === id);
  if (!option) return;
  const accounts = (await option.provider.request({ method: "eth_accounts" })) as string[];
  if (accounts.length) await connect(option);
}

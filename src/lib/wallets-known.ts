/**
 * The wallets Eden knows by name: their logo, how to reopen this page inside each one's own browser (a phone with
 * no wallet injected), and where to get it (a desktop with none). Installed wallets announce their own name and icon
 * (EIP-6963); these are only for the links, and for an in-app browser that injects window.ethereum without announcing.
 * Every wallet here can add a custom network (Elysium, chain 99901).
 */
export type KnownWallet = {
  key: "metamask" | "rabby" | "okx" | "coinbase" | "trust" | "bitget";
  name: string;
  icon: string;
  /** reopen `url` in the wallet app's in-app browser; undefined when the app has no such link */
  open?: (url: string) => string;
  install: string;
};

const bare = (u: string) => u.replace(/^https?:\/\//, "");

export const KNOWN: KnownWallet[] = [
  { key: "metamask", name: "MetaMask", icon: "/wallets/metamask.svg", open: (u) => `https://metamask.app.link/dapp/${bare(u)}`, install: "https://metamask.io/download" },
  { key: "okx", name: "OKX Wallet", icon: "/wallets/okx.svg",
    open: (u) => `https://www.okx.com/download?deeplink=${encodeURIComponent(`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(u)}`)}`,
    install: "https://web3.okx.com/download" },
  { key: "coinbase", name: "Coinbase Wallet", icon: "/wallets/coinbase.svg", open: (u) => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(u)}`, install: "https://www.coinbase.com/wallet/downloads" },
  // coin_id 60 = Ethereum in Trust's numbering: opens the EVM browser, which then adds Elysium
  { key: "trust", name: "Trust Wallet", icon: "/wallets/trust.svg", open: (u) => `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(u)}`, install: "https://trustwallet.com/download" },
  { key: "rabby", name: "Rabby", icon: "/wallets/rabby.svg", install: "https://rabby.io" },
  { key: "bitget", name: "Bitget Wallet", icon: "/wallets/bitget.svg", open: (u) => `https://bkcode.vip?action=dapp&url=${encodeURIComponent(u)}`, install: "https://web3.bitget.com/en/wallet-download" },
];

export const WC_ICON = "/wallets/walletconnect.svg";

export const isPhone = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

type Flags = Record<string, unknown>;
/** Which known wallet an unannounced window.ethereum is (wallet in-app browsers). */
export function knownInjected(): KnownWallet | undefined {
  const w = window as unknown as { ethereum?: Flags; okxwallet?: unknown; trustwallet?: unknown; bitkeep?: unknown };
  const e = w.ethereum;
  if (!e) return undefined;
  const ua = navigator.userAgent;
  const by = (k: KnownWallet["key"]) => KNOWN.find((x) => x.key === k);
  if (e.isRabby) return by("rabby");
  if (w.okxwallet || e.isOkxWallet || e.isOKExWallet || /OKApp/i.test(ua)) return by("okx");
  if (w.trustwallet || e.isTrust || e.isTrustWallet) return by("trust");
  if (w.bitkeep || e.isBitKeep || e.isBitget) return by("bitget");
  if (e.isCoinbaseWallet) return by("coinbase");
  if (e.isMetaMask || /MetaMaskMobile/i.test(ua)) return by("metamask");
  return undefined;
}

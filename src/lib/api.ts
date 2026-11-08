/** Typed client for the Eden server (proxied at /api in development). Amounts are raw wei strings. */
export type Token = {
  address: string; curve: string; creator: string; name: string; symbol: string; logo: string; description: string;
  socials: Partial<Record<"twitter" | "telegram" | "discord" | "website" | "farcaster", string>>;
  supply: string; graduation_threshold: string; real_quote_reserve: string; price_quote: string; market_cap_quote: string;
  curve_fee_bps: number; creator_tax_bps: number; buyback_enabled: boolean; phase: "curve" | "swept" | "pool";
  launched_at: string; graduated_at: string | null; last_trade_at: string | null;
  trades_count: number; holders: number; volume_24h_quote: string; trades_24h: number; change_24h: number;
  graduation_progress: number; market_cap_usd: number | null; volume_24h_usd: number | null; price_usd: number | null;
  creator_x: string | null; creator_tiktok: string | null; creator_verified: boolean;
  /** "x" when the token was launched by tagging @EdenOnElysium on X; creator_x is then the tweeter, `creator` the bot wallet. */
  launched_via?: "x" | null; launch_tweet_id?: string | null;
  creator_ethos_score: number | null; creator_ethos_level: string | null;
};
export type CreatorLinks = { address: string; x?: { handle: string; ethos: { score: number; level: string; profileUrl: string } | null }; tiktok?: { handle: string } };
export type Trade = {
  tx_hash: string; log_index: number; at: string; token: string; venue: "curve" | "pool"; side: "buy" | "sell";
  trader: string; signer: string; source: string; quote_amount: string; token_amount: string; price_quote: string;
};
export type Candle = { bucket: string; open: string; high: string; low: string; close: string; volume_quote: string; trades: number };
export type Holder = { holder: string; amount: string };
export type Portfolio = {
  positions: Array<Token & { balance: string }>;
  fees: Array<{ asset: string; earned: string; claimable: string }>;
  created: Token[];
};
export type ReferralSummary = {
  referred_by: string | null; code: string | null; referred_wallets: number; referred_volume_quote: string;
  earned_quote: string; paid_quote: string; pending_quote: string;
  wallets: Array<{ wallet: string; bound_at: string; volume_quote: string; earned_quote: string }>;
  payouts: Array<{ id: string; amount: string; status: string; tx_hash: string | null; created_at: string }>;
};
export type Tab = "trending" | "new" | "graduating" | "graduated";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`The Eden server answered ${res.status} for ${path}.`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(data.message ?? `The Eden server answered ${res.status}.`);
  return data;
}

export type BuilderRequest = {
  onEden: boolean; contract?: string; tokenName?: string; needs: string[]; about?: string; asking?: string;
  name?: string; email?: string; social?: string; website?: string; wallet?: string; company?: string;
};

export const api = {
  builders: (r: BuilderRequest) => post<{ status: string }>("/builders", r),
  tokens: (q: { tab: Tab; q?: string; sort?: string; limit?: number; offset?: number }) => {
    const p = new URLSearchParams({ tab: q.tab, limit: String(q.limit ?? 50), offset: String(q.offset ?? 0) });
    if (q.q) p.set("q", q.q);
    if (q.sort) p.set("sort", q.sort);
    return get<{ tokens: Token[]; total: number; hypeUsd: number | null }>("/tokens?" + p);
  },
  token: (a: string) => get<{ token: Token; hypeUsd: number | null }>(`/tokens/${a}`),
  trades: (a: string) => get<{ trades: Trade[] }>(`/tokens/${a}/trades?limit=50`),
  candles: (a: string, interval: string, from?: Date) =>
    get<{ candles: Candle[] }>(`/tokens/${a}/candles?interval=${interval}` + (from ? `&from=${from.toISOString()}` : "")),
  holders: (a: string) => get<{ holders: Holder[] }>(`/tokens/${a}/holders?limit=50`),
  portfolio: (w: string) => get<Portfolio>(`/wallets/${w}/portfolio`),
  walletTrades: (w: string) => get<{ trades: Trade[] }>(`/wallets/${w}/trades?limit=50`),
  stats: () => get<{ stats: Record<string, string | number>; hypeUsd: number | null }>("/stats"),
  creator: (a: string) => get<CreatorLinks>(`/creators/${a}`),
  quota: (a: string) => get<{ used: number; limit: number; resetsAt: string }>(`/creators/${a}/quota`),
  oauthPlatforms: () => get<{ x: boolean; tiktok: boolean }>("/creators/oauth/platforms"),
  oauthStartUrl: (platform: "x" | "tiktok", wallet: string) => `${BASE}/creators/oauth/${platform}/start?wallet=${wallet}`,
  linkMessage: (offer: string) => get<{ platform: "x" | "tiktok"; handle: string; wallet: string; message: string }>(`/creators/links/message?offer=${offer}`),
  link: (offer: string, wallet: string, signature: string) => post<{ status: "linked" | "refreshed"; platform: string; handle: string }>("/creators/links", { offer, wallet, signature }),
  referral: (w: string) => get<{ referral: ReferralSummary }>(`/referrals/${w}`),
  referralMessage: (wallet: string, code: string) => get<{ message: string; referrer: string }>(`/referrals/message?wallet=${wallet}&code=${code}`),
  bindReferral: (wallet: string, code: string, signature: string) => post<{ status: string }>("/referrals", { wallet, code, signature }),
  codeMessage: (wallet: string, code: string) => get<{ message: string }>(`/referrals/codes/message?wallet=${wallet}&code=${code}`),
  claimCode: (wallet: string, code: string, signature: string) => post<{ code: string }>("/referrals/codes", { wallet, code, signature }),
};

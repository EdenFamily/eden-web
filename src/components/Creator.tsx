import { short } from "../lib/format";
import { EthosChip, type EthosSource } from "./Ethos";
import { Copy } from "./ui";

/** Platform logo shown after a verified handle. */
export function PlatformMark({ platform }: { platform: "x" | "tiktok" }) {
  return (
    <span className="pf" title={platform === "x" ? "Verified on X" : "Verified on TikTok"}>
      {platform === "x"
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M4 4h4.5L20 20h-4.5zM19.5 4l-6.6 7.2M4.5 20l6.6-7.2" /></svg>
        : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 3h3a4 4 0 0 0 4 4v3a7 7 0 0 1-4-1.3V15a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3z" /></svg>}
    </span>
  );
}

type Source = EthosSource & { creator: string; creator_x?: string | null; creator_tiktok?: string | null; creator_verified?: boolean; launched_via?: "x" | null; launch_tweet_id?: string | null };

/** The wallet to mark as "Dev": nobody for X launches, where the deployer is only Eden's bot wallet. */
export const devWallet = (t: Source): string | undefined => (t.launched_via === "x" ? undefined : t.creator.toLowerCase());

/**
 * Who created a token: the creator's verified X or TikTok handle (only for launches inside the 5-per-month quota),
 * otherwise their wallet address. The full form always keeps the wallet, with a copy button.
 */
export function Creator({ t, compact }: { t: Source; compact?: boolean }) {
  // Launched from X: the tweeter is the creator (their linked wallet gets the fees); the deployer is only the bot wallet.
  if (t.launched_via === "x" && t.creator_x) {
    const tag = <span className="vx">@{t.creator_x}<PlatformMark platform="x" /></span>;
    if (compact) return tag;
    return (
      <span className="creator"><span className="faint">Created by</span><span className="av">{t.creator_x[0]!.toUpperCase()}</span>{tag}<EthosChip t={t} />
        {t.launch_tweet_id && <><span className="dotsep" /><a className="faint" href={`https://x.com/i/status/${t.launch_tweet_id}`} target="_blank" rel="noreferrer">launched from X ↗</a></>}</span>
    );
  }
  const platform = t.creator_verified ? (t.creator_x ? "x" : t.creator_tiktok ? "tiktok" : undefined) : undefined;
  const handle = platform === "x" ? t.creator_x : platform === "tiktok" ? t.creator_tiktok : undefined;
  const name = platform && handle ? <span className="vx">@{handle}<PlatformMark platform={platform} /></span> : null;
  if (compact) return name ?? <span className="mono">{short(t.creator)}</span>;
  return (
    <span className="creator"><span className="faint">Created by</span>
      {name && <><span className="av">{handle![0]!.toUpperCase()}</span>{name}{platform === "x" && <EthosChip t={t} />}<span className="dotsep" /></>}
      <span className="mono">{short(t.creator)}</span><Copy value={t.creator} label="Copy creator wallet" /></span>
  );
}

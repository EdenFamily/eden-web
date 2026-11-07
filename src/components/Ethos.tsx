/** Ethos credibility for creators with a linked X account. The mark comes from src/assets/ethos/mark.svg when present. */
const found = import.meta.glob("../assets/ethos/mark.svg", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const MARK = Object.values(found)[0];

export type EthosSource = { creator_x?: string | null; creator_ethos_score?: number | null; creator_ethos_level?: string | null };

const title = (level: string) => level.charAt(0).toUpperCase() + level.slice(1);

export function EthosChip({ t, compact }: { t: EthosSource; compact?: boolean }) {
  if (t.creator_ethos_score == null || !t.creator_ethos_level || !t.creator_x) return null;
  const url = `https://app.ethos.network/profile/x/${encodeURIComponent(t.creator_x)}`;
  const label = `Ethos credibility ${t.creator_ethos_score}, ${title(t.creator_ethos_level)}`;
  return (
    <a className={`ethos ${compact ? "ethos-sm" : ""}`} href={url} target="_blank" rel="noreferrer" aria-label={label} title={label}
      onClick={(e) => e.stopPropagation()}>
      {MARK ? <img src={MARK} alt="" /> : <i aria-hidden="true" />}
      <span className="mono">{t.creator_ethos_score}</span>
      {!compact && <span>· {title(t.creator_ethos_level)}</span>}
    </a>
  );
}

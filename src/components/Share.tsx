import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../lib/api";
import { useWallet } from "../lib/wallet";
import { I } from "./icons";
import { toast } from "./ui";

type Shareable = { address: string; symbol: string; name: string };

/** The connected wallet's referral code: its chosen code, else its own address (the server accepts both). */
const codes = new Map<string, Promise<string>>();
function useRefCode(): string | undefined {
  const w = useWallet();
  const [code, setCode] = useState<string>();
  useEffect(() => {
    const a = w.address?.toLowerCase();
    if (!a) return setCode(undefined);
    if (!codes.has(a)) codes.set(a, api.referral(a).then((r) => r.referral.code ?? a, () => a));
    let live = true;
    void codes.get(a)!.then((c) => { if (live) setCode(c); });
    return () => { live = false; };
  }, [w.address]);
  return code;
}

export function tokenLink(address: string, ref?: string): string {
  return `${location.origin}/token/${address}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
}

/**
 * Share a token: post on X, copy the link, download its card. The link carries the sharer's referral code, so
 * anyone who joins through it earns them 25% of Eden's fee on their trades. The menu sits in a portal so a
 * scrolling rail or a clipped card never cuts it off.
 */
export function ShareButton({ t, compact = false, className = "" }: { t: Shareable; compact?: boolean; className?: string }) {
  const ref = useRefCode();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>();
  const btn = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  const link = tokenLink(t.address, ref);

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const place = () => {
      const r = btn.current!.getBoundingClientRect(), w = 240;
      setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) });
    };
    place();
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>("a, button")?.focus();
    const away = (e: Event) => { if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("pointerdown", away); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", key); };
  }, [open]);

  const done = () => setOpen(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast(ref ? "Link copied. You earn from everyone who joins through it." : "Link copied"); }
    catch { toast("Copy is blocked here. Select the link instead.", "err"); }
    done();
  };
  const native = async () => { try { await navigator.share({ title: `$${t.symbol} on Eden`, text: `$${t.symbol} on Eden`, url: link }); } catch { /* closed */ } done(); };
  const post = `https://x.com/intent/post?text=${encodeURIComponent(`$${t.symbol} on Eden`)}&url=${encodeURIComponent(link)}`;

  return (<>
    <button ref={btn} type="button" className={compact ? `iconbtn sm ${className}` : `btn btn-quiet btn-sm sharebtn ${className}`}
      aria-label={compact ? `Share $${t.symbol}` : undefined} aria-haspopup="menu" aria-expanded={open}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}>
      {I.share()}{!compact && "Share"}
    </button>
    {open && pos && createPortal(
      <div ref={menu} className="share-menu" role="menu" style={{ top: pos.top, left: pos.left }} onClick={(e) => e.stopPropagation()}>
        {typeof navigator.share === "function" && <button type="button" role="menuitem" onClick={() => void native()}>{I.share()}Share…</button>}
        <a role="menuitem" href={post} target="_blank" rel="noreferrer" onClick={done}>{I.x(14)}Post on X</a>
        <button type="button" role="menuitem" onClick={() => void copy()}>{I.copy(14)}Copy link</button>
        <a role="menuitem" href={`/api/tokens/${t.address}/card.png`} download={`${t.symbol}-eden.png`} onClick={done}>{I.download()}Download card</a>
        <p className="share-note">{ref ? "Your referral code is in the link. You earn 25% of Eden's fee on every trade from people who join through it." : "Sign in to put your referral code in the link and earn from it."}</p>
      </div>, document.body)}
  </>);
}

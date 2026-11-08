import { useEffect, useState } from "react";
import { askToConnect } from "./Shell";
import { Link } from "./router";

const SEEN = "eden-x-intro-seen";
const XLogo = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
const TikTokLogo = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 3h3a4 4 0 0 0 4 4v3a7 7 0 0 1-4-1.3V15a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3z" /></svg>;

/** First visit only: how launching from X works (link X, tag @edenfamily under any post, free), TikTok coming soon.
 * Closing it is remembered in this browser. Before launch the first step points to the docs instead of the wallet. */
export function XIntro({ prelaunch = false }: { prelaunch?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(SEEN) === "1"; } catch { /* storage unavailable: show it */ }
    if (!seen) { const t = setTimeout(() => setOpen(true), 900); return () => clearTimeout(t); }
  }, []);
  const close = () => { setOpen(false); try { localStorage.setItem(SEEN, "1"); } catch { /* storage unavailable */ } };
  if (!open) return null;
  return (
    <aside className="xi" role="dialog" aria-labelledby="xi-title">
      <button className="xi-close" type="button" onClick={close} aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <div className="xi-head"><span className="xi-x"><XLogo /></span><div><h2 id="xi-title">Launch from X</h2><p>{prelaunch ? "Live when Eden opens." : "Any post can become a token."}</p></div></div>
      <ol className="xi-steps">
        <li><b>Link your X</b> to your Eden wallet, once.</li>
        <li>Under any post, reply <span className="xi-code">@edenfamily $TICKER Name</span></li>
        <li><b>It launches free.</b> The creator fees are yours.</li>
      </ol>
      <div className="xi-actions">
        {prelaunch
          ? <Link className="btn btn-primary btn-sm" to="/docs#x-launch" onClick={close}>How it works</Link>
          : <button className="btn btn-primary btn-sm" type="button" onClick={() => { close(); askToConnect(); }}>Link X</button>}
        <Link className="xi-more" to="/docs#x-launch" onClick={close}>Read more</Link>
      </div>
      <div className="xi-soon"><span className="xi-tt"><TikTokLogo /></span>TikTok launches coming soon</div>
    </aside>
  );
}

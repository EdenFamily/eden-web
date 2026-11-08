import { useEffect, useRef, useState, type ReactNode } from "react";
import { hype, short } from "../lib/format";
import { disconnect, switchToElysium, useWallet, walletState } from "../lib/wallet";
import { WalletSheet } from "./WalletSheet";
import { I, Mark } from "./icons";
import { Link, navigate, usePath } from "./router";
import { api } from "../lib/api";
import { PlatformMark } from "./Creator";
import { Copy, toast, useData } from "./ui";
import { SiteFooter } from "./Footer";
import { XIntro } from "./XIntro";

/** Before launch only the reading pages are open. */
const PRELAUNCH_NAV = [
  { to: "/", label: "Home", icon: I.explore },
  { to: "/docs", label: "Docs", icon: I.docs },
  { to: "/builders", label: "Builders", icon: I.referrals },
  { to: "/brand", label: "Brand kit", icon: I.create },
];
const NAV = [
  { to: "/", label: "Explore", icon: I.explore },
  { to: "/create", label: "Create a token", icon: I.create },
  { to: "/portfolio", label: "Portfolio", icon: I.portfolio },
  { to: "/referrals", label: "Referrals", icon: I.referrals },
];

let openWalletPanel: () => void = () => {};
const walletStateAddress = () => walletState().address;
/** Opens the wallet panel from anywhere (Buy, Launch, Sign in). */
export const askToConnect = () => openWalletPanel();

function useTheme(): [boolean, () => void] {
  const sys = () => !matchMedia("(prefers-color-scheme: light)").matches;
  const read = () => { const t = document.documentElement.dataset.theme; return t ? t === "dark" : sys(); };
  const [dark, setDark] = useState(read);
  useEffect(() => {
    try { const s = localStorage.getItem("eden-theme"); if (s) { document.documentElement.dataset.theme = s; setDark(s === "dark"); } } catch { /* storage unavailable */ }
  }, []);
  return [dark, () => {
    const next = read() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("eden-theme", next); } catch { /* storage unavailable */ }
    setDark(next === "dark");
  }];
}

/**
 * X / TikTok linking. A platform shows only once its OAuth keys are configured on the server (or when this wallet
 * already has that account linked); with neither platform available the whole section is hidden.
 */
function LinkedAccounts({ wallet }: { wallet: string }) {
  const links = useData(() => api.creator(wallet.toLowerCase()), [wallet]);
  const platforms = useData(() => api.oauthPlatforms(), []);
  // TikTok shows as "Soon" until its keys are configured; X appears only once it is configured.
  const rows = (["x", "tiktok"] as const).filter((p) => links.data?.[p] || platforms.data?.[p] || (p === "tiktok" && platforms.data));
  if (rows.length === 0) return null;
  return (
    <>
      <span className="lbl">Linked accounts</span>
      {rows.map((platform) => {
        const linked = links.data?.[platform];
        const icon = <span className="ic" style={{ background: "var(--ink)", color: "var(--bg)" }}><PlatformMark platform={platform} /></span>;
        return linked
          ? <div key={platform} className="opt">{icon}<span className="vx" style={{ fontSize: 13 }}>@{linked.handle}</span><span className="end ok">Linked</span></div>
          : !platforms.data?.[platform]
            ? <button key={platform} className="opt" type="button" disabled>{icon}Link {platform === "x" ? "X" : "TikTok"}<span className="soon" style={{ marginLeft: "auto" }}>Soon</span></button>
            : <button key={platform} className="opt" type="button" onClick={() => { window.location.href = api.oauthStartUrl(platform, wallet); }}>{icon}Link {platform === "x" ? "X" : "TikTok"}<span className="end ok">Connect</span></button>;
      })}
      <p className="help" style={{ fontSize: 12 }}>A linked handle shows as the creator on your tokens. Each account links to one Eden wallet, permanently.</p>
      <div className="sep" />
    </>
  );
}

function WalletPanel({ onClose }: { onClose: () => void }) {
  const w = useWallet();
  if (!w.address) return null;
  return (
    <div className="pop tex" role="dialog" aria-label="Wallet" onClick={(e) => e.stopPropagation()}>
      <div className="who">
        {w.wallet?.icon ? <img className="tile" src={w.wallet.icon} alt="" width={40} height={40} /> : <span className="tile" style={{ width: 40, height: 40, background: "conic-gradient(var(--accent),var(--gold),var(--accent))" }} />}
        <div>
          <div className="addr" style={{ display: "flex", alignItems: "center", gap: 6 }}>{short(w.address)}<Copy value={w.address} label="Copy your address" /></div>
          <div className="sub">{w.balance != null ? hype(Number(w.balance) / 1e18) : "…"}{w.wallet && <span className="faint"> · {w.wallet.name}</span>}</div>
        </div>
      </div>
      {w.wrongChain && <div className="wrongnet"><span>Your wallet is on another network.</span><button className="btn btn-primary btn-sm" type="button" onClick={() => void switchToElysium()}>Switch to Elysium</button></div>}
      <div className="sep" />
      <LinkedAccounts wallet={w.address} />
      <div className="row2">
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => { onClose(); navigate("/portfolio"); }}>Portfolio</button>
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => { disconnect(); onClose(); toast("Disconnected"); }}>Disconnect</button>
      </div>
    </div>
  );
}

export function Shell({ children, search, onSearch, prelaunch = false }: { children: ReactNode; search: string; onSearch: (q: string) => void; prelaunch?: boolean }) {
  const nav = prelaunch ? PRELAUNCH_NAV : NAV;
  const path = usePath();
  const w = useWallet();
  const [dark, toggleTheme] = useTheme();
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  /** Disconnected: the connect sheet. Connected: the wallet panel. */
  const openWallet = () => (walletStateAddress() ? setOpen(true) : setSheet(true));
  openWalletPanel = openWallet;
  useEffect(() => {
    const close = () => setOpen(false);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "/" && !(e.target as HTMLElement).matches("input, textarea")) { e.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", key); };
  }, []);
  const active = (to: string) => (to === "/" ? path === "/" || path.startsWith("/token/") : path.startsWith(to));
  return (
    <>
      <nav className="side" aria-label="Main">
        <Link className="brand" to="/" aria-label="Eden home"><Mark size={22} /></Link>
        {nav.map((n) => <Link key={n.to} className="nav" to={n.to} aria-current={(prelaunch && n.to === "/" ? path === "/" : active(n.to)) ? "page" : undefined}>{n.icon()}{n.label}</Link>)}
        {!prelaunch && <>
          <Link className="nav" to="/docs#perps">{I.perps()}Perps<span className="soon">Soon</span></Link>
          <Link className="nav docs" to="/docs" aria-current={path.startsWith("/docs") ? "page" : undefined}>{I.docs()}Docs</Link>
          <button className="nav" type="button" onClick={(e) => { e.stopPropagation(); openWallet(); }}>{I.signin()}<span>{w.address ? short(w.address) : "Sign in"}</span></button>
        </>}
      </nav>
      <header className="top">
        <Link className="mbrand" to="/" aria-label="Eden home"><Mark size={32} kind="icon" /></Link>
        {prelaunch ? <span className="prelaunch-note"><i aria-hidden="true" />Opening November 9</span> : <label className="search" htmlFor="q">{I.search()}
          <input id="q" ref={searchRef} type="search" placeholder="Search name, ticker or address" autoComplete="off" value={search}
            onChange={(e) => { onSearch(e.target.value); if (path !== "/") navigate("/"); }} />
          <span className="kbd">/</span>
        </label>}
        <div className="top-end">
          <button className="iconbtn" type="button" onClick={toggleTheme} aria-label={dark ? "Switch to light" : "Switch to dark"}>{dark ? I.sun() : I.moon()}</button>
          {prelaunch ? null : w.address
            ? <button className="wbtn" type="button" aria-expanded={open} aria-haspopup="dialog" aria-label="Wallet" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
                {w.wallet?.icon ? <img className="wicon" src={w.wallet.icon} alt="" width={18} height={18} /> : <span className="dot" />}
                {w.wrongChain && <span className="dot" style={{ background: "var(--down)" }} title="Wrong network" />}{short(w.address)}<span className="bal">{w.balance != null ? (Number(w.balance) / 1e18).toFixed(2) : "…"}</span>
              </button>
            : <button className="btn btn-primary connect" type="button" aria-haspopup="dialog" onClick={(e) => { e.stopPropagation(); setSheet(true); }}>{I.wallet(16)}<span>Connect</span></button>}
          {open && <WalletPanel onClose={() => setOpen(false)} />}
          {sheet && <WalletSheet onClose={() => setSheet(false)} />}
        </div>
      </header>
      <main>{children}</main>
      <footer><SiteFooter prelaunch={prelaunch} /></footer>
      <XIntro prelaunch={prelaunch} />
      <nav className="mbar" aria-label="Main">
        {nav.map((n) => <Link key={n.to} to={n.to} aria-current={active(n.to) ? "page" : undefined}>{n.icon(20)}{n.label.replace(" a token", "")}</Link>)}
      </nav>
    </>
  );
}

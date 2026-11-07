import { useEffect, useRef, useState, type ReactNode } from "react";
import { hype, short } from "../lib/format";
import { connect, disconnect, switchToElysium, useWallet, walletOptions, walletState } from "../lib/wallet";
import { I, Mark } from "./icons";
import { Link, navigate, usePath } from "./router";
import { api } from "../lib/api";
import { PlatformMark } from "./Creator";
import { Copy, toast, useData } from "./ui";

const NAV = [
  { to: "/", label: "Explore", icon: I.explore },
  { to: "/create", label: "Create a token", icon: I.create },
  { to: "/portfolio", label: "Portfolio", icon: I.portfolio },
  { to: "/referrals", label: "Referrals", icon: I.referrals },
];

let openWalletPanel: () => void = () => {};
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
  const rows = (["x", "tiktok"] as const).filter((p) => links.data?.[p] || platforms.data?.[p]);
  if (rows.length === 0) return null;
  return (
    <>
      <span className="lbl">Linked accounts</span>
      {rows.map((platform) => {
        const linked = links.data?.[platform];
        const icon = <span className="ic" style={{ background: "var(--ink)", color: "var(--bg)" }}><PlatformMark platform={platform} /></span>;
        return linked
          ? <div key={platform} className="opt">{icon}<span className="vx" style={{ fontSize: 13 }}>@{linked.handle}</span><span className="end ok">Linked</span></div>
          : <button key={platform} className="opt" type="button" onClick={() => { window.location.href = api.oauthStartUrl(platform, wallet); }}>{icon}Link {platform === "x" ? "X" : "TikTok"}<span className="end ok">Connect</span></button>;
      })}
      <p className="help" style={{ fontSize: 12 }}>A linked handle shows as the creator on your tokens. Each account links to one Eden wallet, permanently.</p>
      <div className="sep" />
    </>
  );
}

function WalletPanel({ onClose }: { onClose: () => void }) {
  const w = useWallet();
  const options = walletOptions();
  if (!w.address) {
    return (
      <div className="pop tex" role="dialog" aria-label="Connect a wallet" onClick={(e) => e.stopPropagation()}>
        <h3>Connect a wallet</h3>
        {options.length === 0 && <p className="help">No browser wallet found. Install MetaMask or Rabby, then reload this page.</p>}
        {options.map((o) => (
          <button key={o.id} className="opt" type="button" onClick={async () => {
            try { await connect(o); onClose(); toast(`Connected ${short(walletState().address ?? "")}`); } catch (e) { toast((e as Error).message.split("\n")[0]!, "err"); }
          }}>
            {o.icon ? <img src={o.icon} alt="" width={26} height={26} style={{ borderRadius: 7 }} /> : <span className="ic" style={{ background: "var(--well)" }}>W</span>}
            {o.name}
          </button>
        ))}
        <p className="help" style={{ fontSize: 12 }}>Eden adds the Elysium network (chain 99901) to your wallet if it is missing.</p>
      </div>
    );
  }
  return (
    <div className="pop tex" role="dialog" aria-label="Wallet" onClick={(e) => e.stopPropagation()}>
      <div className="who">
        <span className="tile" style={{ width: 40, height: 40, background: "conic-gradient(var(--accent),var(--gold),var(--accent))" }} />
        <div>
          <div className="addr" style={{ display: "flex", alignItems: "center", gap: 6 }}>{short(w.address)}<Copy value={w.address} label="Copy your address" /></div>
          <div className="sub">{w.balance != null ? hype(Number(w.balance) / 1e18) : "…"}</div>
        </div>
      </div>
      {w.wrongChain && <button className="btn btn-primary btn-sm" type="button" onClick={() => void switchToElysium()}>Switch to Elysium</button>}
      <div className="sep" />
      <LinkedAccounts wallet={w.address} />
      <div className="row2">
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => { onClose(); navigate("/portfolio"); }}>Portfolio</button>
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => { disconnect(); onClose(); toast("Disconnected"); }}>Disconnect</button>
      </div>
    </div>
  );
}

export function Shell({ children, search, onSearch }: { children: ReactNode; search: string; onSearch: (q: string) => void }) {
  const path = usePath();
  const w = useWallet();
  const [dark, toggleTheme] = useTheme();
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  openWalletPanel = () => setOpen(true);
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
        <Link className="brand" to="/"><Mark /><b>EDEN</b></Link>
        {NAV.map((n) => <Link key={n.to} className="nav" to={n.to} aria-current={active(n.to) ? "page" : undefined}>{n.icon()}{n.label}</Link>)}
        <span className="nav" aria-disabled="true">{I.perps()}Perps<span className="soon">Soon</span></span>
        <Link className="nav docs" to="/docs" aria-current={path.startsWith("/docs") ? "page" : undefined}>{I.docs()}Docs</Link>
        <button className="nav" type="button" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>{I.signin()}<span>{w.address ? short(w.address) : "Sign in"}</span></button>
      </nav>
      <header className="top">
        <label className="search" htmlFor="q">{I.search()}
          <input id="q" ref={searchRef} type="search" placeholder="Search name, ticker or address" autoComplete="off" value={search}
            onChange={(e) => { onSearch(e.target.value); if (path !== "/") navigate("/"); }} />
          <span className="kbd">/</span>
        </label>
        <div className="top-end">
          <button className="iconbtn" type="button" onClick={toggleTheme} aria-label={dark ? "Switch to light" : "Switch to dark"}>{dark ? I.sun() : I.moon()}</button>
          <button className="wbtn" type="button" aria-expanded={open} aria-haspopup="dialog" aria-label="Wallet" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
            {w.address ? <><span className="dot" style={w.wrongChain ? { background: "var(--down)" } : undefined} />{short(w.address)}<span className="bal">{w.balance != null ? (Number(w.balance) / 1e18).toFixed(2) : "…"}</span></> : I.wallet()}
          </button>
          {open && <WalletPanel onClose={() => setOpen(false)} />}
        </div>
      </header>
      <main>{children}</main>
      <footer><span>Eden is a non-custodial interface on Elysium. Tokens are created by their creators. Nothing here is financial advice.</span><span className="mono">Chain 99901 · HYPE</span></footer>
      <nav className="mbar" aria-label="Main">
        {NAV.map((n) => <Link key={n.to} to={n.to} aria-current={active(n.to) ? "page" : undefined}>{n.icon(20)}{n.label.replace(" a token", "")}</Link>)}
      </nav>
    </>
  );
}

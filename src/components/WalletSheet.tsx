import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { encode } from "uqr";
import { cancelPairing, connect, lastWalletId, rememberLast, useWalletOptions, walletError, walletState, type WalletOption } from "../lib/wallet";
import { isPhone, KNOWN, WC_ICON } from "../lib/wallets-known";
import { toast } from "./ui";

type View = { at: "choose" } | { at: "pending"; option: WalletOption } | { at: "qr"; option: WalletOption; uri?: string } | { at: "error"; option: WalletOption; message: string };
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function Logo({ icon, name, size = 32 }: { icon?: string; name: string; size?: number }) {
  return icon ? <img className="ws-logo" src={icon} alt="" width={size} height={size} /> : <span className="ws-logo ws-letter" style={{ width: size, height: size }} aria-hidden="true">{name[0]}</span>;
}

/** The pairing link as a QR (Eden's mark in the middle, high error correction keeps it readable). */
function PairingQr({ uri }: { uri: string }) {
  const { d, size } = useMemo(() => {
    const { data, size } = encode(uri, { ecc: "H", border: 1 });
    const hole = Math.round(size * 0.22), from = Math.floor((size - hole) / 2), to = from + hole;
    let d = "";
    data.forEach((row, y) => row.forEach((on, x) => { if (on && !(x >= from && x < to && y >= from && y < to)) d += `M${x} ${y}h1v1h-1z`; }));
    return { d, size };
  }, [uri]);
  const c = size / 2, logo = size * 0.2;
  return (
    <svg className="ws-qr" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code to connect a phone wallet" shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={d} fill="#04181c" />
      <image href="/brand/eden-icon.svg?v=w1" x={c - logo / 2} y={c - logo / 2} width={logo} height={logo} />
    </svg>
  );
}

export function WalletSheet({ onClose }: { onClose: () => void }) {
  const options = useWalletOptions();
  const [view, setView] = useState<View>({ at: "choose" });
  const [copied, setCopied] = useState(false);
  const phone = isPhone();
  const recent = lastWalletId();
  const installed = options.filter((o) => o.kind === "injected");
  const wc = options.find((o) => o.kind === "walletconnect");
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    card.current?.querySelector<HTMLElement>("button, a")?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);

  function close() { cancelPairing(); onClose(); }

  async function pick(option: WalletOption) {
    setView(option.kind === "walletconnect" ? { at: "qr", option } : { at: "pending", option });
    try {
      await connect(option, (uri) => uri && setView({ at: "qr", option, uri }));
      rememberLast(option.id);
      onClose();
      const w = walletState();
      toast(w.wrongChain ? `Connected ${short(w.address ?? "")}. Switch to Elysium to trade.` : `Connected ${short(w.address ?? "")}`);
    } catch (e) {
      setView({ at: "error", option, message: walletError(e) });
    }
  }

  const copy = async (uri: string) => {
    try { await navigator.clipboard.writeText(uri); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  };
  const back = view.at !== "choose" ? () => { cancelPairing(); setView({ at: "choose" }); } : undefined;
  const here = typeof location !== "undefined" ? location.href : "https://edenfamily.xyz";

  return createPortal(
    <div className="ws-scrim" onClick={close}>
      <div ref={card} className="ws-card" role="dialog" aria-modal="true" aria-labelledby="ws-title" onClick={(e) => e.stopPropagation()}>
        <div className="ws-head">
          {back ? <button className="ws-icon" type="button" onClick={back} aria-label="Back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></button> : <span className="ws-icon" aria-hidden="true" />}
          <img className="ws-mark" src="/brand/eden-icon.svg?v=w1" alt="" width={36} height={36} />
          <button className="ws-icon" type="button" onClick={close} aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>

        {view.at === "choose" && <>
          <h2 id="ws-title">Connect to Eden</h2>
          <p className="ws-sub">Connecting is free: no transaction, no fees.</p>
          {installed.length > 0 && <>
            <div className="ws-label">{phone ? "This wallet" : "Installed"}</div>
            <ul className="ws-list">
              {installed.map((o) => (
                <li key={o.id}><button type="button" onClick={() => void pick(o)}>
                  <Logo icon={o.icon} name={o.name} /><span className="ws-name">{o.name}</span>
                  {recent === o.id ? <span className="ws-tag recent">Recent</span> : <span className="ws-tag">Detected</span>}
                </button></li>
              ))}
            </ul>
          </>}
          {installed.length === 0 && phone && <>
            <div className="ws-label">Open Eden in your wallet app</div>
            <ul className="ws-list">
              {KNOWN.filter((k) => k.open).map((k) => (
                <li key={k.key}><a href={k.open!(here)}><Logo icon={k.icon} name={k.name} /><span className="ws-name">{k.name}</span><span className="ws-tag">Open</span></a></li>
              ))}
            </ul>
          </>}
          {wc && <>
            {(installed.length > 0 || phone) && <div className="ws-label">{phone ? "Other wallet apps" : "Phone wallet"}</div>}
            <ul className="ws-list">
              <li><button type="button" onClick={() => void pick(wc)}>
                <Logo icon={WC_ICON} name="WalletConnect" /><span className="ws-name">WalletConnect<small>{phone ? "Any wallet app" : "Scan a QR with your phone"}</small></span>
                {recent === wc.id && <span className="ws-tag recent">Recent</span>}
              </button></li>
            </ul>
          </>}
          {installed.length === 0 && !phone && <>
            <div className="ws-label">No wallet in this browser · get one</div>
            <ul className="ws-list ws-grid">
              {KNOWN.map((k) => (
                <li key={k.key}><a href={k.install} target="_blank" rel="noreferrer"><Logo icon={k.icon} name={k.name} size={28} /><span className="ws-name">{k.name}</span></a></li>
              ))}
            </ul>
            <p className="ws-note">Install one, then reload this page.</p>
          </>}
          <p className="ws-foot">Eden never holds your funds or keys. Your wallet adds the Elysium network (chain 99901) when you connect.</p>
        </>}

        {view.at === "pending" && <div className="ws-state" aria-live="polite">
          <div className="ws-ring"><Logo icon={view.option.icon} name={view.option.name} size={52} /></div>
          <h2 id="ws-title">Confirm in {view.option.name}</h2>
          <p className="ws-sub">Approve the connection in your wallet. It then asks to switch to Elysium.</p>
          <button className="btn btn-quiet" type="button" onClick={() => void pick(view.option)}>Ask again</button>
        </div>}

        {view.at === "qr" && <div className="ws-state" aria-live="polite">
          <h2 id="ws-title">{phone ? "Connect your wallet app" : "Scan with your phone"}</h2>
          <p className="ws-sub">{phone ? "Open your wallet app, approve Eden, then come back here." : "Open your wallet app, tap scan, and point it here."}</p>
          {view.uri ? <>
            {!phone && <PairingQr uri={view.uri} />}
            <div className="ws-actions">
              {phone && <a className="btn btn-primary" href={view.uri}>Open wallet app</a>}
              <button className="btn btn-quiet" type="button" onClick={() => void copy(view.uri!)} aria-live="polite">{copied ? "Copied" : "Copy link"}</button>
            </div>
          </> : <div className="ws-qr ws-qr-wait" aria-label="Preparing the QR code"><span className="ws-spin" /></div>}
        </div>}

        {view.at === "error" && <div className="ws-state" role="alert">
          <div className="ws-ring off"><Logo icon={view.option.icon} name={view.option.name} size={52} /></div>
          <h2 id="ws-title">Not connected</h2>
          <p className="ws-sub">{view.message}</p>
          <div className="ws-actions"><button className="btn btn-primary" type="button" onClick={() => void pick(view.option)}>Try again</button></div>
        </div>}
      </div>
    </div>,
    document.body,
  );
}


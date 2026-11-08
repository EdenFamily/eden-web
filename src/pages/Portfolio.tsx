import { useState } from "react";
import { api } from "../lib/api";
import { contracts, escrowAbi } from "../lib/chain";
import { amount, fromWei, hype, pct, short, since, usd } from "../lib/format";
import { useLive } from "../lib/live";
import { send, useWallet } from "../lib/wallet";
import { I } from "../components/icons";
import { Link, navigate } from "../components/router";
import { askToConnect } from "../components/Shell";
import { TokenImage, toast, useData } from "../components/ui";
import { LinkXNudge } from "../components/LinkXNudge";

/** Signed out: what the page is for and one button. Shared with Referrals. */
export function Gate({ title, body, icon }: { title: string; body: string; icon: JSX.Element }) {
  return (
    <div className="panel tex gate">
      <span className="glyph" aria-hidden="true">{icon}</span>
      <h2>{title}</h2>
      <p>{body}</p>
      <button className="btn btn-primary" type="button" onClick={(e) => { e.stopPropagation(); askToConnect(); }}>{I.wallet(16)}Connect wallet</button>
    </div>
  );
}

const open = (to: string) => ({ tabIndex: 0, onClick: () => navigate(to), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter") navigate(to); } });

export function Portfolio() {
  const w = useWallet();
  const [tab, setTab] = useState<"hold" | "made" | "hist">("hold");
  const [busy, setBusy] = useState(false);
  const pf = useData(() => (w.address ? api.portfolio(w.address.toLowerCase()) : Promise.resolve(undefined)), [w.address]);
  const hist = useData(() => (w.address ? api.walletTrades(w.address.toLowerCase()) : Promise.resolve(undefined)), [w.address]);
  // The portfolio endpoint doesn't price positions yet (price_usd is null): value them from price_quote × HYPE/USD.
  const stats = useData(() => api.stats(), []);
  useLive(w.address ? `wallet:${w.address}` : undefined, () => { pf.reload(); hist.reload(); });
  if (!w.address) return (
    <div className="wrap"><div className="head"><h1>Portfolio</h1></div>
      <Gate icon={I.portfolio(22)} title="See everything you hold on Eden" body="Connect your wallet to see your tokens and what they're worth, the creator fees you can claim, and your trade history." /></div>
  );
  const data = pf.data;
  const hypeUsd = stats.data?.hypeUsd ?? 0;
  const priceUsd = (p: { price_usd: number | null; price_quote: string }) => p.price_usd ?? fromWei(p.price_quote) * hypeUsd;
  const valueHype = (data?.positions ?? []).reduce((s, p) => s + fromWei(p.balance) * fromWei(p.price_quote), 0);
  const value = (data?.positions ?? []).reduce((s, p) => s + fromWei(p.balance) * priceUsd(p), 0);
  const claimable = fromWei(data?.fees.find((f) => f.asset === "native")?.claimable ?? "0");
  const known = new Map([...(data?.positions ?? []), ...(data?.created ?? [])].map((t) => [t.address.toLowerCase(), t]));
  async function claim() {
    setBusy(true);
    try { await send(contracts.feeEscrow, escrowAbi, "claim", []); toast(`Claimed ${hype(claimable)}`); pf.reload(); }
    catch (e) { const m = (e as Error).message; toast(/rejected|denied/i.test(m) ? "Cancelled in your wallet." : m.split("\n")[0]!, "err"); }
    finally { setBusy(false); }
  }
  const tok = (t: { address: string; logo: string; name: string; symbol: string }) =>
    <div className="tok"><TokenImage address={t.address} logo={t.logo} size={36} label={t.name} /><div><div className="t">${t.symbol}</div><div className="n">{t.name}</div></div></div>;
  return (
    <div className="wrap">
      <div className="head"><h1>Portfolio</h1></div>
      <LinkXNudge />
      <div className="stats">
        <div className="panel tex stat"><span className="lbl">Token value</span><span className="v">{data ? (hypeUsd ? usd(value) : hype(valueHype)) : <span className="skel" style={{ width: 90, height: 22 }} />}</span>{data && hypeUsd > 0 && <span className="d muted">{hype(valueHype)}</span>}</div>
        <div className="panel tex stat"><span className="lbl">HYPE balance</span><span className="v">{hype(fromWei(w.balance ?? 0n))}</span><span className="d muted">{hypeUsd ? usd(fromWei(w.balance ?? 0n) * hypeUsd) : ""}</span></div>
        <div className="panel tex stat"><span className="lbl">Creator fees to claim</span><span className="v">{hype(claimable)}</span>
          <span className="d">{claimable > 0
            ? <button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={() => void claim()}>{busy ? "Confirm in your wallet" : `Claim ${hype(claimable)}`}</button>
            : <span className="muted">Fees from tokens you launch land here.</span>}</span></div>
      </div>
      <section className="panel tex">
        <div className="tabs" role="group" aria-label="Show">{([["hold", "Holdings", data?.positions.length], ["made", "Created", data?.created.length], ["hist", "History", undefined]] as const).map(([k, l, n]) => <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}{n ? <span className="faint"> {n}</span> : null}</button>)}</div>
        <div className="tscroll">
          {tab === "hold" && <table><thead><tr className="lbl"><th className="l">Token</th><th>Balance</th><th>Value</th><th className="c-hide">24h</th></tr></thead><tbody>
            {(data?.positions ?? []).map((p) => <tr key={p.address} className="link" {...open(`/token/${p.address}`)} aria-label={`$${p.symbol}`}><td className="l">{tok(p)}</td><td>{amount(fromWei(p.balance))}</td><td>{hypeUsd || p.price_usd != null ? usd(fromWei(p.balance) * priceUsd(p)) : hype(fromWei(p.balance) * fromWei(p.price_quote))}</td><td className={`c-hide ${p.change_24h >= 0 ? "up" : "down"}`}>{pct(p.change_24h)}</td></tr>)}
          </tbody></table>}
          {tab === "made" && <table><thead><tr className="lbl"><th className="l">Token</th><th>Market cap</th><th className="c-hide">Graduation</th><th>Launched</th></tr></thead><tbody>
            {(data?.created ?? []).map((t) => <tr key={t.address} className="link" {...open(`/token/${t.address}`)} aria-label={`$${t.symbol}`}><td className="l">{tok(t)}</td><td>{usd(t.market_cap_usd ?? fromWei(t.market_cap_quote) * hypeUsd)}</td><td className="c-hide">{t.phase === "curve" ? Math.round(t.graduation_progress * 100) + "%" : <span className="done"><i />Graduated</span>}</td><td className="muted">{since(t.launched_at)}</td></tr>)}
          </tbody></table>}
          {tab === "hist" && <table className="dense"><thead><tr className="lbl"><th className="l">Side</th><th className="l">Token</th><th>HYPE</th><th className="c-hide">Amount</th><th>When</th></tr></thead><tbody>
            {(hist.data?.trades ?? []).map((x) => { const k = known.get(x.token.toLowerCase()); return <tr key={x.tx_hash + x.log_index} className="link" {...open(`/token/${x.token}`)}><td className={`l ${x.side === "buy" ? "up" : "down"}`}>{x.side === "buy" ? "Buy" : "Sell"}</td><td className="l mono">{k ? `$${k.symbol}` : short(x.token)}</td><td>{fromWei(x.quote_amount).toFixed(3)}</td><td className="c-hide">{amount(fromWei(x.token_amount))}</td><td className="muted">{since(x.at)}</td></tr>; })}
          </tbody></table>}
          {pf.loading && !data && <div className="empty"><span className="skel" style={{ width: "60%" }} /></div>}
          {pf.error && <div className="empty"><p className="err" style={{ margin: 0 }}>Couldn't load your portfolio. {pf.error}</p><button className="btn btn-quiet btn-sm" type="button" onClick={pf.reload}>Try again</button></div>}
          {data && tab === "hold" && data.positions.length === 0 && <div className="empty">You don't hold any Eden tokens yet.<div><Link className="btn btn-quiet btn-sm" to="/">Find one on Explore</Link></div></div>}
          {data && tab === "made" && data.created.length === 0 && <div className="empty">You haven't launched a token yet.<div><Link className="btn btn-primary btn-sm" to="/create">{I.plus()}Launch a token</Link></div></div>}
          {tab === "hist" && hist.data?.trades.length === 0 && <div className="empty">No trades yet. Your buys and sells on Eden show here.</div>}
        </div>
      </section>
    </div>
  );
}

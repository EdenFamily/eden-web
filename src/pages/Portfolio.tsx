import { useState } from "react";
import { api } from "../lib/api";
import { contracts, escrowAbi } from "../lib/chain";
import { ago, amount, fromWei, hype, pct, usd } from "../lib/format";
import { useLive } from "../lib/live";
import { send, useWallet } from "../lib/wallet";
import { navigate } from "../components/router";
import { askToConnect } from "../components/Shell";
import { TokenImage, toast, useData } from "../components/ui";

export function Portfolio() {
  const w = useWallet();
  const [tab, setTab] = useState<"hold" | "made" | "hist">("hold");
  const [busy, setBusy] = useState(false);
  const pf = useData(() => (w.address ? api.portfolio(w.address.toLowerCase()) : Promise.resolve(undefined)), [w.address]);
  const hist = useData(() => (w.address ? api.walletTrades(w.address.toLowerCase()) : Promise.resolve(undefined)), [w.address]);
  useLive(w.address ? `wallet:${w.address}` : undefined, () => { pf.reload(); hist.reload(); });
  if (!w.address) return (
    <div className="wrap"><div className="head"><h1>Portfolio</h1></div>
      <div className="panel tex empty"><p style={{ margin: "0 0 16px" }}>Sign in to see your tokens, the fees you've earned and your trades.</p><button className="btn btn-primary" type="button" onClick={(e) => { e.stopPropagation(); askToConnect(); }}>Sign in</button></div></div>
  );
  const data = pf.data;
  const hypeUsd = data?.positions[0] ? (data.positions[0].price_usd ?? 0) / Math.max(1e-30, fromWei(data.positions[0].price_quote)) : 0;
  const value = (data?.positions ?? []).reduce((s, p) => s + fromWei(p.balance) * (p.price_usd ?? 0), 0);
  const claimable = fromWei(data?.fees.find((f) => f.asset === "native")?.claimable ?? "0");
  async function claim() {
    setBusy(true);
    try { await send(contracts.feeEscrow, escrowAbi, "claim", []); toast(`Claimed ${hype(claimable)}`); pf.reload(); }
    catch (e) { const m = (e as Error).message; toast(/rejected|denied/i.test(m) ? "Cancelled in your wallet." : m.split("\n")[0]!, "err"); }
    finally { setBusy(false); }
  }
  return (
    <div className="wrap">
      <div className="head"><h1>Portfolio</h1></div>
      <div className="stats">
        <div className="panel tex stat"><span className="lbl">Token value</span><span className="v">{usd(value)}</span></div>
        <div className="panel tex stat"><span className="lbl">HYPE balance</span><span className="v">{hype(fromWei(w.balance ?? 0n))}</span><span className="d muted">{hypeUsd ? usd(fromWei(w.balance ?? 0n) * hypeUsd) : ""}</span></div>
        <div className="panel tex stat"><span className="lbl">Fees to claim</span><span className="v">{hype(claimable)}</span>
          <span className="d"><button className="btn btn-primary btn-sm" type="button" disabled={busy || claimable <= 0} onClick={() => void claim()}>{busy ? "Confirm in wallet" : "Claim"}</button></span></div>
      </div>
      <section className="panel tex">
        <div className="tabs" role="group">{([["hold", "Holdings"], ["made", "Created"], ["hist", "History"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
        <div className="tscroll">
          {tab === "hold" && <table><thead><tr className="lbl"><th className="l">Token</th><th>Balance</th><th>Value</th><th>24h</th></tr></thead><tbody>
            {(data?.positions ?? []).map((p) => <tr key={p.address} className="link" onClick={() => navigate(`/token/${p.address}`)}><td className="l"><div className="tok"><TokenImage address={p.address} logo={p.logo} size={36} label={p.name} /><div><div className="t">${p.symbol}</div><div className="n">{p.name}</div></div></div></td><td>{amount(fromWei(p.balance))}</td><td>{usd(fromWei(p.balance) * (p.price_usd ?? 0))}</td><td className={p.change_24h >= 0 ? "up" : "down"}>{pct(p.change_24h)}</td></tr>)}
          </tbody></table>}
          {tab === "made" && <table><thead><tr className="lbl"><th className="l">Token</th><th>Market cap</th><th>Graduation</th><th>Launched</th></tr></thead><tbody>
            {(data?.created ?? []).map((t) => <tr key={t.address} className="link" onClick={() => navigate(`/token/${t.address}`)}><td className="l"><div className="tok"><TokenImage address={t.address} logo={t.logo} size={36} label={t.name} /><div><div className="t">${t.symbol}</div><div className="n">{t.name}</div></div></div></td><td>{usd(t.market_cap_usd)}</td><td>{t.phase === "curve" ? Math.round(t.graduation_progress * 100) + "%" : "Graduated"}</td><td className="muted">{ago(t.launched_at)} ago</td></tr>)}
          </tbody></table>}
          {tab === "hist" && <table><thead><tr className="lbl"><th className="l">Side</th><th className="l">Token</th><th>HYPE</th><th>Amount</th><th>When</th></tr></thead><tbody>
            {(hist.data?.trades ?? []).map((x) => <tr key={x.tx_hash + x.log_index} className="link" onClick={() => navigate(`/token/${x.token}`)}><td className={`l ${x.side === "buy" ? "up" : "down"}`}>{x.side === "buy" ? "Buy" : "Sell"}</td><td className="l mono">{x.token.slice(0, 8)}…</td><td>{fromWei(x.quote_amount).toFixed(3)}</td><td>{amount(fromWei(x.token_amount))}</td><td className="muted">{ago(x.at)} ago</td></tr>)}
          </tbody></table>}
          {pf.loading && !data && <div className="empty"><span className="skel" /></div>}
          {pf.error && <div className="empty err">{pf.error}</div>}
          {data && tab === "hold" && data.positions.length === 0 && <div className="empty">No tokens yet. Find one on Explore.</div>}
          {data && tab === "made" && data.created.length === 0 && <div className="empty">You haven't launched a token yet.</div>}
          {tab === "hist" && hist.data?.trades.length === 0 && <div className="empty">No trades yet.</div>}
        </div>
      </section>
    </div>
  );
}

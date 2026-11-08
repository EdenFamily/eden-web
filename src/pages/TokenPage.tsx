import { useEffect, useMemo, useState } from "react";
import { formatUnits, maxUint256, parseUnits, type Address } from "viem";
import { api, type Candle, type Token } from "../lib/api";
import { curveAbi, erc20Abi, publicClient } from "../lib/chain";
import { quoteBuy, quoteSell, readCurve, type CurveState } from "../lib/curve";
import { ago, amount, fromWei, hype, pct, short, usd, usdFull } from "../lib/format";
import { useLive } from "../lib/live";
import { send, useWallet } from "../lib/wallet";
import { Creator, devWallet } from "../components/Creator";
import { I } from "../components/icons";
import { Link } from "../components/router";
import { askToConnect } from "../components/Shell";
import { ShareButton } from "../components/Share";
import { Copy, TokenImage, toast, useData } from "../components/ui";

const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
const SPAN_H: Record<string, number> = { "1m": 2, "5m": 8, "15m": 24, "1h": 72, "4h": 24 * 10, "1d": 24 * 60 };

function niceTicks(lo: number, hi: number, n: number): number[] {
  const step0 = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0)!;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
  return out;
}

function Chart({ candles, toUsd, unit, gradLine }: { candles: Candle[]; toUsd: (wei: string) => number; unit: "price" | "mcap"; gradLine?: number }) {
  const W = 760, H = 330, padR = 74, padT = 14, volH = 52, plotH = H - padT - volH - 26;
  if (candles.length === 0) return <div className="empty">No trades in this window yet.</div>;
  const k = unit === "mcap" ? 1e9 : 1;
  const cs = candles.map((c) => ({ o: toUsd(c.open) * k, h: toUsd(c.high) * k, l: toUsd(c.low) * k, c: toUsd(c.close) * k, v: fromWei(c.volume_quote), t: new Date(c.bucket) }));
  let lo = Math.min(...cs.map((c) => c.l)), hi = Math.max(...cs.map((c) => c.h));
  if (gradLine && unit === "mcap") hi = Math.max(hi, gradLine * 1.04);
  if (hi === lo) { hi *= 1.05; lo *= 0.95; }
  lo = Math.max(0, lo - (hi - lo) * 0.08);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * plotH, cw = (W - padR) / Math.max(cs.length, 24);
  const fmt = (v: number) => (unit === "mcap" ? usd(v) : "$" + v.toPrecision(3));
  const vmax = Math.max(...cs.map((c) => c.v)) || 1, last = cs[cs.length - 1]!;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${unit === "mcap" ? "Market cap" : "Price"} chart`}>
      {niceTicks(lo, hi, 5).map((v) => <g key={v}><line x1="0" x2={W - padR} y1={y(v)} y2={y(v)} stroke="var(--rule)" /><text x={W - padR + 8} y={y(v) + 4} fill="var(--faint)" fontSize="11" fontFamily="var(--mono)">{fmt(v)}</text></g>)}
      {gradLine && unit === "mcap" && <g><line x1="0" x2={W - padR} y1={y(gradLine)} y2={y(gradLine)} stroke="var(--gold)" strokeDasharray="4 4" /><text x="6" y={y(gradLine) - 6} fill="var(--gold)" fontSize="11" fontFamily="var(--mono)">Graduates at {usd(gradLine)}</text></g>}
      {cs.map((c, i) => {
        const x = i * cw + cw * 0.18, w = cw * 0.64, col = c.c >= c.o ? "var(--accent)" : "var(--down)", vh = (c.v / vmax) * volH;
        return <g key={i}><line x1={x + w / 2} x2={x + w / 2} y1={y(c.h)} y2={y(c.l)} stroke={col} /><rect x={x} y={Math.min(y(c.o), y(c.c))} width={w} height={Math.max(1, Math.abs(y(c.o) - y(c.c)))} fill={col} /><rect x={x} y={H - 22 - vh} width={w} height={vh} fill={col} opacity={0.28} /></g>;
      })}
      <line x1="0" x2={W - padR} y1={y(last.c)} y2={y(last.c)} stroke="var(--accent)" strokeDasharray="2 3" opacity={0.7} />
      <rect x={W - padR + 2} y={y(last.c) - 10} width={padR - 2} height="20" rx="3" fill="var(--accent)" />
      <text x={W - padR + 8} y={y(last.c) + 4} fill="var(--on-accent)" fontSize="11" fontWeight="600" fontFamily="var(--mono)">{fmt(last.c)}</text>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => { const c = cs[Math.min(cs.length - 1, Math.round(f * (cs.length - 1)))]!; return <text key={f} x={Math.min(W - padR - 20, Math.max(20, (f * (cs.length - 1) + 0.5) * cw))} y={H - 6} fill="var(--faint)" fontSize="11" fontFamily="var(--mono)" textAnchor="middle">{c.t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</text>; })}
    </svg>
  );
}

function TradePanel({ t }: { t: Token }) {
  const w = useWallet();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [input, setInput] = useState("0.5");
  const [curve, setCurve] = useState<CurveState>();
  const [held, setHeld] = useState<bigint>(0n);
  const [busy, setBusy] = useState("");
  const onCurve = t.phase === "curve";
  useEffect(() => { if (onCurve) void readCurve(t.curve as Address).then(setCurve); }, [t.curve, t.real_quote_reserve, onCurve]);
  useEffect(() => {
    if (!w.address) return setHeld(0n);
    void publicClient.readContract({ address: t.address as Address, abi: erc20Abi, functionName: "balanceOf", args: [w.address] }).then(setHeld);
  }, [w.address, t.address, busy]);
  const amountIn = useMemo(() => { try { return input ? parseUnits(input, 18) : 0n; } catch { return 0n; } }, [input]);
  const q = curve && amountIn > 0n ? (side === "buy" ? quoteBuy(curve, amountIn) : quoteSell(curve, amountIn)) : undefined;
  const minOut = q ? (q.out * 99n) / 100n : 0n;
  const balance = side === "buy" ? w.balance ?? 0n : held;
  const tooMuch = amountIn > balance;
  async function go() {
    if (!w.address) return askToConnect();
    if (!q) return;
    try {
      if (side === "buy") {
        setBusy("Confirm in your wallet");
        await send(t.curve as Address, curveAbi, "buy", [amountIn, minOut, w.address], amountIn);
        toast(`Bought ${amount(Number(formatUnits(q.out, 18)))} $${t.symbol}`);
      } else {
        const allowance = await publicClient.readContract({ address: t.address as Address, abi: erc20Abi, functionName: "allowance", args: [w.address, t.curve as Address] });
        if (allowance < amountIn) { setBusy("Approve in your wallet (once per token)"); await send(t.address as Address, erc20Abi, "approve", [t.curve, maxUint256]); }
        setBusy("Confirm in your wallet");
        await send(t.curve as Address, curveAbi, "sell", [amountIn, minOut, w.address]);
        toast(`Sold for ${hype(Number(formatUnits(q.out, 18)))}`);
      }
      setInput("");
    } catch (e) {
      const m = (e as Error).message;
      toast(/rejected|denied/i.test(m) ? "Cancelled in your wallet." : /Slippage/i.test(m) ? "Price moved more than 1%. Nothing was traded; try again." : m.split("\n")[0]!, "err");
    } finally { setBusy(""); }
  }
  const presets = side === "buy" ? ["0.1", "0.5", "1", "5"] : ["25%", "50%", "75%", "Max"];
  return (
    <aside className="panel tex trade" aria-label="Trade">
      <div className="seg">{(["buy", "sell"] as const).map((s) => <button key={s} type="button" aria-pressed={side === s} onClick={() => { setSide(s); setInput(""); }}>{s === "buy" ? "Buy" : "Sell"}</button>)}</div>
      {!onCurve ? (
        <p className="note">This token graduated. It now trades on its Uniswap V4 pool; trading it from Eden comes in the next release.</p>
      ) : (<>
        <div className="box">
          <div className="box-row"><span className="muted" style={{ fontSize: 13 }}>You pay</span><span className="muted mono" style={{ fontSize: 12 }}>Balance {side === "buy" ? hype(fromWei(w.balance ?? 0n)) : `${amount(fromWei(held))} ${t.symbol}`}</span></div>
          <div className="box-row"><input id="amt" className="amt" inputMode="decimal" placeholder="0" value={input} onChange={(e) => setInput(e.target.value.replace(/[^0-9.]/g, ""))} aria-label="Amount to pay" />
            <span className="asset">{side === "buy" ? <><i style={{ background: "var(--accent)", color: "var(--on-accent)" }}>H</i>HYPE</> : <><TokenImage address={t.address} logo={t.logo} size={22} label={t.name} />{t.symbol}</>}</span></div>
          <div className="chips">{presets.map((p) => <button key={p} className="chip" type="button" onClick={() => setInput(p.endsWith("%") || p === "Max" ? formatUnits((held * BigInt(p === "Max" ? 100 : parseInt(p))) / 100n, 18) : p)}>{p}</button>)}</div>
        </div>
        <button className="flip" type="button" aria-label="Switch buy and sell" onClick={() => { setSide(side === "buy" ? "sell" : "buy"); setInput(""); }}>{I.flip()}</button>
        <div className="box"><span className="muted" style={{ fontSize: 13 }}>You get</span>
          <div className="box-row"><span className="amt mono">{q ? (side === "buy" ? amount(Number(formatUnits(q.out, 18))) : Number(formatUnits(q.out, 18)).toFixed(4)) : "—"}</span>
            <span className="asset">{side === "buy" ? <><TokenImage address={t.address} logo={t.logo} size={22} label={t.name} />{t.symbol}</> : <><i style={{ background: "var(--accent)", color: "var(--on-accent)" }}>H</i>HYPE</>}</span></div></div>
        <div className="kv"><span>Price impact</span><b>{q ? (q.impactBps / 100).toFixed(2) + "%" : "—"}</b></div>
        <div className="kv"><span>Minimum received</span><b>{q ? (side === "buy" ? `${amount(Number(formatUnits(minOut, 18)))} ${t.symbol}` : hype(Number(formatUnits(minOut, 18)))) : "—"}</b></div>
        <div className="kv"><span>Fees</span><b>{t.curve_fee_bps / 100}% curve + {t.creator_tax_bps / 100}% creator</b></div>
        <div className="kv"><span>Route</span><b>Bonding curve</b></div>
        {w.address && tooMuch && amountIn > 0n && <p className="err">That's more than your balance.</p>}
        <button className="btn btn-primary btn-block" type="button" style={{ height: 48 }} disabled={!!busy || (!!w.address && (!q || tooMuch))} onClick={() => void go()}>
          {busy || (!w.address ? "Sign in" : !q ? "Enter an amount" : side === "buy" ? `Buy ${hype(Number(input))}` : `Sell ${amount(Number(input))} ${t.symbol}`)}
        </button>
      </>)}
    </aside>
  );
}

export function TokenPage({ address }: { address: string }) {
  const [interval, setIntervalSel] = useState<(typeof INTERVALS)[number]>("15m");
  const [unit, setUnit] = useState<"price" | "mcap">("mcap");
  const [tab, setTab] = useState<"trades" | "holders">("trades");
  const tok = useData(() => api.token(address), [address]);
  const trades = useData(() => api.trades(address), [address]);
  const holders = useData(() => api.holders(address), [address, tab]);
  const candles = useData(() => api.candles(address, interval, new Date(Date.now() - SPAN_H[interval]! * 3600_000)), [address, interval]);
  useLive(`token:${address}`, (f) => { if (f.type === "trade" || f.type === "token") { tok.reload(); trades.reload(); candles.reload(); } });
  if (tok.error) return <div className="wrap"><Link className="back" to="/">{I.back()}Explore</Link><div className="empty err">{tok.error.includes("404") ? "No Eden token at this address." : tok.error}</div></div>;
  if (!tok.data) return <div className="wrap"><div className="empty"><span className="skel" /></div></div>;
  const t = tok.data.token, hypeUsd = tok.data.hypeUsd ?? 0;
  const toUsd = (wei: string) => fromWei(wei) * hypeUsd;
  const threshold = fromWei(t.graduation_threshold), raised = fromWei(t.real_quote_reserve), phantom = threshold / 2.5;
  const gradMcap = ((phantom + threshold) ** 2 / phantom) * hypeUsd;
  const p = Math.round(t.graduation_progress * 100);
  const last = candles.data?.candles.at(-1);
  return (
    <div className="wrap">
      <Link className="back" to="/">{I.back()}Explore</Link>
      <div className="thead"><span className="thead-art"><TokenImage address={t.address} logo={t.logo} size={96} label={t.name} /></span>
        <div><div className="name">{t.name}{t.phase !== "curve" && <span className="done status-pill"><i />Graduated · Uniswap V4</span>}</div>
          <div className="meta"><span className="mono">${t.symbol} / HYPE</span><span className="dotsep" /><span>{ago(t.launched_at)} ago</span><span className="dotsep" />
            <span className="kv2"><span className="faint">Contract</span><span className="mono">{short(t.address)}</span><Copy value={t.address} label="Copy contract address" /></span>
            <ShareButton t={t} />
            {t.socials.twitter && <a className="iconbtn sm" href={t.socials.twitter} target="_blank" rel="noreferrer" aria-label={`${t.name} on X`}>{I.x()}</a>}
            {t.socials.telegram && <a className="iconbtn sm" href={t.socials.telegram} target="_blank" rel="noreferrer" aria-label={`${t.name} on Telegram`}>{I.telegram()}</a>}
            {t.socials.website && <a className="iconbtn sm" href={t.socials.website} target="_blank" rel="noreferrer" aria-label={`${t.name} website`}>{I.globe()}</a>}</div>
          <div className="meta"><Creator t={t} /></div></div>
        <div className="panel tex mcap-box"><div className="lbl">Market cap</div><div className="v">{usdFull(t.market_cap_usd)}</div><div className={`mono ${t.change_24h >= 0 ? "up" : "down"}`} style={{ fontSize: 13 }}>{pct(t.change_24h)} 24h</div></div></div>
      <div className="tgrid"><div className="tcol">
        <div className="stats">
          <div className="panel tex stat"><span className="lbl">Price</span><span className="v">{t.price_usd != null ? "$" + t.price_usd.toPrecision(3) : "—"}</span></div>
          <div className="panel tex stat"><span className="lbl">Volume 24h</span><span className="v">{usd(t.volume_24h_usd)}</span></div>
          <div className="panel tex stat"><span className="lbl">Holders</span><span className="v">{t.holders.toLocaleString()}</span></div>
          <div className="panel tex stat"><span className="lbl">Supply</span><span className="v">{amount(fromWei(t.supply)).replace(".00", "")}</span></div>
        </div>
        {t.phase === "curve" && <div className="panel tex gradcard">
            <div className="box-row"><span><span className="big">{p}%</span> <span className="muted">to graduation</span></span><span className="mono muted">{(threshold - raised).toFixed(1)} HYPE to go</span></div>
            <div className="gbar"><span style={{ width: `${p}%` }} /></div>
            <div className="gmeta"><span className="mono">{raised.toFixed(1)} / {threshold.toFixed(1)} HYPE</span><span>Graduates at {usd(gradMcap)} into Uniswap V4</span></div>
        </div>}
        <div className="panel tex chart"><div className="chart-top">
          <div className="seg seg-small">{INTERVALS.map((x) => <button key={x} type="button" aria-pressed={x === interval} onClick={() => setIntervalSel(x)}>{x.toUpperCase().replace("M", "m").replace("H", "h")}</button>)}</div>
          <div className="seg seg-small"><button type="button" aria-pressed={unit === "price"} onClick={() => setUnit("price")}>Price</button><button type="button" aria-pressed={unit === "mcap"} onClick={() => setUnit("mcap")}>Mkt cap</button></div></div>
          {last && <div className="ohlc">{(["open", "high", "low", "close"] as const).map((k) => <span key={k}>{k[0]!.toUpperCase()} <b>{unit === "mcap" ? usd(toUsd(last[k]) * 1e9) : "$" + toUsd(last[k]).toPrecision(3)}</b></span>)}</div>}
          {candles.data ? <Chart candles={candles.data.candles} toUsd={toUsd} unit={unit} gradLine={t.phase === "curve" ? gradMcap : undefined} /> : <div className="empty"><span className="skel" /></div>}</div>
        <section className="panel tex"><div className="tabs" role="group"><button type="button" aria-pressed={tab === "trades"} onClick={() => setTab("trades")}>Trades</button><button type="button" aria-pressed={tab === "holders"} onClick={() => setTab("holders")}>Holders</button></div>
          <div className="tscroll">{tab === "trades" ? (
            <table><thead><tr className="lbl"><th className="l">Side</th><th className="l">Trader</th><th>HYPE</th><th>${t.symbol}</th><th>Age</th></tr></thead>
              <tbody>{(trades.data?.trades ?? []).map((x) => <tr key={x.tx_hash + x.log_index}><td className={`l ${x.side === "buy" ? "up" : "down"}`}>{x.side === "buy" ? "Buy" : "Sell"}</td><td className="l">{short(x.signer || x.trader)} {(x.signer || x.trader).toLowerCase() === devWallet(t) && <span className="tag tag-dev">Dev</span>}</td><td>{fromWei(x.quote_amount).toFixed(3)}</td><td>{amount(fromWei(x.token_amount))}</td><td className="muted">{ago(x.at)}</td></tr>)}</tbody></table>
          ) : (
            <table><thead><tr className="lbl"><th className="l">#</th><th className="l">Holder</th><th>Share</th></tr></thead>
              <tbody>{(holders.data?.holders ?? []).map((h, i) => <tr key={h.holder}><td className="l faint">{i + 1}</td><td className="l">{h.holder === t.curve.toLowerCase() ? "Bonding curve" : short(h.holder)} {h.holder === devWallet(t) && <span className="tag tag-dev">Dev</span>}</td><td>{((fromWei(h.amount) / fromWei(t.supply)) * 100).toFixed(2)}%</td></tr>)}</tbody></table>
          )}
          {tab === "trades" && trades.data?.trades.length === 0 && <div className="empty">No trades yet.</div>}</div></section>
        {t.description && <div className="panel tex about"><span className="lbl">About</span><p>{t.description}</p></div>}
      </div><div className="tside"><TradePanel t={t} /><PerpsFund t={t} /></div></div>
    </div>
  );
}

/** Progress of this token's perps fund, once the server reports it. How it's funded is on /docs#perps. */
function PerpsFund({ t }: { t: Token }) {
  if (t.perps_fund_hype == null || !t.perps_fund_target_hype) return null;
  const have = Number(t.perps_fund_hype), need = Number(t.perps_fund_target_hype), full = have >= need;
  return (
    <div className="panel tex perps-fund">
      <div className="box-row"><span className="lbl">Perps fund</span><span className="pf-pill">{full ? "Funded" : "Building"}</span></div>
      <div className="pf-amt"><span className="mono">{have.toFixed(1)}</span> <span className="faint mono">/ {need.toFixed(0)} HYPE</span></div>
      <div className="gbar"><span style={{ width: `${Math.min(100, (have / need) * 100)}%` }} /></div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Saved from trading fees toward this token's perps listing. <Link to="/docs#perps">How it works</Link></p>
    </div>
  );
}

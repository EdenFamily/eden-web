import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, type Candle, type Token } from "../lib/api";
import { amount, fromWei, pct, price, short, since, usd, usdFull } from "../lib/format";
import { useLive } from "../lib/live";
import { useWallet } from "../lib/wallet";
import { Creator, devWallet } from "../components/Creator";
import { I } from "../components/icons";
import { Link } from "../components/router";
import { ShareButton } from "../components/Share";
import { TradePanel, pickTradeSide } from "../components/TradePanel";
import { Copy, StateCard, TokenImage, useData } from "../components/ui";

const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
const SPAN_H: Record<string, number> = { "1m": 2, "5m": 8, "15m": 24, "1h": 72, "4h": 24 * 10, "1d": 24 * 60 };

function niceTicks(lo: number, hi: number, n: number): number[] {
  const step0 = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0)!;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
  return out;
}

/** The rendered width of an element, so the chart draws at 1:1 and its 11px labels stay 11px on a phone. */
function useWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [el, setEl] = useState<T | null>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, w];
}

function Chart({ candles, toUsd, unit, interval, gradLine }: { candles: Candle[]; toUsd: (wei: string) => number; unit: "price" | "mcap"; interval: string; gradLine?: number }) {
  const [box, width] = useWidth<HTMLDivElement>();
  if (candles.length === 0) return <div className="empty">No trades in this window yet. Pick a longer interval, or make the first trade.</div>;
  const W = Math.max(300, width || 760), narrow = W < 560, H = narrow ? 250 : 330, padR = 70, padT = 14, volH = narrow ? 36 : 52, plotH = H - padT - volH - 26;
  const k = unit === "mcap" ? 1e9 : 1;
  const cs = candles.map((c) => ({ o: toUsd(c.open) * k, h: toUsd(c.high) * k, l: toUsd(c.low) * k, c: toUsd(c.close) * k, v: fromWei(c.volume_quote), t: new Date(c.bucket) }));
  let lo = Math.min(...cs.map((c) => c.l)), hi = Math.max(...cs.map((c) => c.h));
  if (gradLine && unit === "mcap") hi = Math.max(hi, gradLine * 1.04);
  if (hi === lo) { hi *= 1.05; lo *= 0.95; }
  lo = Math.max(0, lo - (hi - lo) * 0.08);
  // A few candles sit at the right edge, next to the last price, instead of alone at the far left.
  const slots = Math.max(cs.length, narrow ? 18 : 30), cw = (W - padR) / slots, x0 = (slots - cs.length) * cw;
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * plotH;
  const fmt = (v: number) => (unit === "mcap" ? usd(v) : price(v));
  const vmax = Math.max(...cs.map((c) => c.v)) || 1, last = cs[cs.length - 1]!;
  const long = interval === "4h" || interval === "1d";
  const when = (d: Date) => (long ? d.toLocaleDateString([], { month: "short", day: "numeric" }) : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  const marks = [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (cs.length - 1))))]
    .reduce<number[]>((a, i) => (a.length === 0 || (i - a[a.length - 1]!) * cw > 72 ? [...a, i] : a), []);
  return (
    <div className="chart-box" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${unit === "mcap" ? "Market cap" : "Price"} chart, last ${fmt(last.c)}`}>
        {niceTicks(lo, hi, narrow ? 4 : 5).map((v) => <g key={v}><line x1="0" x2={W - padR} y1={y(v)} y2={y(v)} stroke="var(--rule)" />
          {Math.abs(y(v) - y(last.c)) > 14 && <text x={W - padR + 8} y={y(v) + 4} fill="var(--faint)" fontSize="11" fontFamily="var(--mono)">{fmt(v)}</text>}</g>)}
        {gradLine && unit === "mcap" && <g><line x1="0" x2={W - padR} y1={y(gradLine)} y2={y(gradLine)} stroke="var(--gold)" strokeDasharray="4 4" /><text x="6" y={y(gradLine) - 6} fill="var(--gold)" fontSize="11" fontFamily="var(--mono)">Graduates at {usd(gradLine)}</text></g>}
        {cs.map((c, i) => {
          const x = x0 + i * cw + cw * 0.18, w = cw * 0.64, col = c.c >= c.o ? "var(--accent)" : "var(--down)", vh = (c.v / vmax) * volH;
          return <g key={i}><line x1={x + w / 2} x2={x + w / 2} y1={y(c.h)} y2={y(c.l)} stroke={col} /><rect x={x} y={Math.min(y(c.o), y(c.c))} width={w} height={Math.max(1, Math.abs(y(c.o) - y(c.c)))} fill={col} /><rect x={x} y={H - 22 - vh} width={w} height={vh} fill={col} opacity={0.28} /></g>;
        })}
        <line x1="0" x2={W - padR} y1={y(last.c)} y2={y(last.c)} stroke="var(--accent)" strokeDasharray="2 3" opacity={0.7} />
        <rect x={W - padR + 2} y={y(last.c) - 10} width={padR - 2} height="20" rx="3" fill="var(--accent)" />
        <text x={W - padR + 8} y={y(last.c) + 4} fill="var(--on-accent)" fontSize="11" fontWeight="600" fontFamily="var(--mono)">{fmt(last.c)}</text>
        {marks.map((i) => <text key={i} x={Math.min(W - padR - 32, Math.max(32, x0 + (i + 0.5) * cw))} y={H - 6} fill="var(--faint)" fontSize="11" fontFamily="var(--mono)" textAnchor="middle">{when(cs[i]!.t)}</text>)}
      </svg>
    </div>
  );
}

/** Phone only: a Buy / Sell bar that stays at the bottom until the trade panel is on screen. */
function MobileTradeBar({ symbol }: { symbol: string }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const el = document.getElementById("trade");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setHidden(!!e?.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const go = (side: "buy" | "sell") => () => {
    pickTradeSide(side);
    document.getElementById("trade")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => document.getElementById("amt")?.focus({ preventScroll: true }), 350);
  };
  return (
    <div className="mtrade" data-hidden={hidden} aria-hidden={hidden}>
      <button className="btn btn-primary" type="button" tabIndex={hidden ? -1 : 0} onClick={go("buy")}>Buy ${symbol}</button>
      <button className="btn btn-quiet" type="button" tabIndex={hidden ? -1 : 0} onClick={go("sell")}>Sell</button>
    </div>
  );
}

function Progress({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  return <div className="gbar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)}><span style={{ width: `${v}%` }} /></div>;
}

export function TokenPage({ address }: { address: string }) {
  const w = useWallet();
  const [interval, setIntervalSel] = useState<(typeof INTERVALS)[number]>("15m");
  const [unit, setUnit] = useState<"price" | "mcap">("mcap");
  const [tab, setTab] = useState<"trades" | "holders">("trades");
  const tok = useData(() => api.token(address), [address]);
  const trades = useData(() => api.trades(address), [address]);
  const holders = useData(() => api.holders(address), [address, tab]);
  const candles = useData(() => api.candles(address, interval, new Date(Date.now() - SPAN_H[interval]! * 3600_000)), [address, interval]);
  useLive(`token:${address}`, (f) => { if (f.type === "trade" || f.type === "token") { tok.reload(); trades.reload(); candles.reload(); } });
  const sym = tok.data?.token.symbol, nm = tok.data?.token.name;
  useEffect(() => { if (sym) document.title = `$${sym} · ${nm} · Eden`; return () => { document.title = "Eden · Every token starts in Eden"; }; }, [sym, nm]);
  if (tok.error) {
    const missing = tok.error.includes("404");
    return (
      <div className="wrap"><Link className="back" to="/">{I.back()}Explore</Link>
        {missing
          ? <StateCard as="h1" code="404" title="No Eden token at this address" body={<>Nothing launched on Eden lives at <span className="mono">{short(address)}</span>. Check the address, or find the token by name or ticker on Explore.</>}>
              <Link className="btn btn-primary" to="/">Go to Explore</Link></StateCard>
          : <StateCard as="h1" title="Couldn't load this token" body={`${tok.error} Check your connection and try again.`}>
              <button className="btn btn-primary" type="button" onClick={tok.reload}>Try again</button><Link className="btn btn-quiet" to="/">Back to Explore</Link></StateCard>}
      </div>
    );
  }
  if (!tok.data) return (
    <div className="wrap" aria-busy="true"><span className="skel" style={{ width: 70 }} />
      <div className="thead"><span className="skel" style={{ width: 96, height: 96, borderRadius: 14 }} /><div style={{ display: "grid", gap: 10 }}><span className="skel" style={{ width: 180, height: 28 }} /><span className="skel" style={{ width: 300 }} /><span className="skel" style={{ width: 200 }} /></div></div>
      <div className="stats">{[0, 1, 2, 3].map((i) => <div key={i} className="panel tex stat"><span className="skel" style={{ width: 60 }} /><span className="skel" style={{ width: 110, height: 22 }} /></div>)}</div>
    </div>
  );
  const t = tok.data.token, hypeUsd = tok.data.hypeUsd ?? 0;
  const toUsd = (wei: string) => fromWei(wei) * hypeUsd;
  const threshold = fromWei(t.graduation_threshold), raised = fromWei(t.real_quote_reserve), phantom = threshold / 2.5;
  const gradMcap = ((phantom + threshold) ** 2 / phantom) * hypeUsd;
  const p = Math.round(t.graduation_progress * 100);
  const last = candles.data?.candles.at(-1);
  const me = w.address?.toLowerCase();
  const who = (a: string) => <>{short(a)} {a.toLowerCase() === devWallet(t) && <span className="tag tag-dev">Dev</span>} {a.toLowerCase() === me && <span className="tag tag-you">You</span>}</>;
  const sub = tab === "trades" ? trades : holders;
  return (
    <div className="wrap">
      <Link className="back" to="/">{I.back()}Explore</Link>
      <div className="thead"><span className="thead-art"><TokenImage address={t.address} logo={t.logo} size={96} label={t.name} /></span>
        <div><h1 className="name">{t.name}{t.phase !== "curve" && <span className="done status-pill"><i />Graduated · Uniswap V4</span>}</h1>
          <div className="meta"><span className="mono">${t.symbol} / HYPE</span><span className="dotsep" /><span>{since(t.launched_at)}</span><span className="dotsep" />
            <span className="kv2"><span className="faint">Contract</span><span className="mono">{short(t.address)}</span><Copy value={t.address} label="Copy contract address" /></span>
            {t.socials.twitter && <a className="iconbtn sm" href={t.socials.twitter} target="_blank" rel="noreferrer" aria-label={`${t.name} on X`}>{I.x()}</a>}
            {t.socials.telegram && <a className="iconbtn sm" href={t.socials.telegram} target="_blank" rel="noreferrer" aria-label={`${t.name} on Telegram`}>{I.telegram()}</a>}
            {t.socials.website && <a className="iconbtn sm" href={t.socials.website} target="_blank" rel="noreferrer" aria-label={`${t.name} website`}>{I.globe()}</a>}
            <ShareButton t={t} /></div>
          <div className="meta"><Creator t={t} /></div></div>
        <div className="panel tex mcap-box"><div className="lbl">Market cap</div><div className="v">{usdFull(t.market_cap_usd)}</div><div className={`mono ${t.change_24h >= 0 ? "up" : "down"}`} style={{ fontSize: 13 }}>{pct(t.change_24h)} 24h</div></div></div>
      <div className="tgrid"><div className="tcol">
        <div className="stats">
          <div className="panel tex stat"><span className="lbl">Price</span><span className="v" title={t.price_usd != null ? `$${t.price_usd}` : undefined}>{price(t.price_usd)}</span></div>
          <div className="panel tex stat"><span className="lbl">Volume 24h</span><span className="v">{usd(t.volume_24h_usd)}</span></div>
          <div className="panel tex stat"><span className="lbl">Holders</span><span className="v">{t.holders.toLocaleString()}</span></div>
          <div className="panel tex stat"><span className="lbl">Supply</span><span className="v">{amount(fromWei(t.supply)).replace(".00", "")}</span></div>
        </div>
        {t.phase === "curve" && <div className="panel tex gradcard">
            <div className="box-row"><span><span className="big">{p}%</span> <span className="muted">to graduation</span></span><span className="mono muted">{Math.max(0, threshold - raised).toFixed(1)} HYPE to go</span></div>
            <Progress value={t.graduation_progress * 100} label="Progress to graduation" />
            <div className="gmeta"><span className="mono">{raised.toFixed(1)} / {threshold.toFixed(1)} HYPE</span><span>Graduates at {usd(gradMcap)} into Uniswap V4</span></div>
        </div>}
        <div className="panel tex chart"><div className="chart-top">
          <div className="seg seg-small" role="group" aria-label="Candle interval">{INTERVALS.map((x) => <button key={x} type="button" aria-pressed={x === interval} onClick={() => setIntervalSel(x)}>{x}</button>)}</div>
          <div className="seg seg-small" role="group" aria-label="Chart unit"><button type="button" aria-pressed={unit === "price"} onClick={() => setUnit("price")}>Price</button><button type="button" aria-pressed={unit === "mcap"} onClick={() => setUnit("mcap")}>Mkt cap</button></div></div>
          {last && <div className="ohlc">{(["open", "high", "low", "close"] as const).map((k) => <span key={k}>{k[0]!.toUpperCase()} <b>{unit === "mcap" ? usd(toUsd(last[k]) * 1e9) : price(toUsd(last[k]))}</b></span>)}</div>}
          {candles.data ? <Chart candles={candles.data.candles} toUsd={toUsd} unit={unit} interval={interval} gradLine={t.phase === "curve" ? gradMcap : undefined} />
            : candles.error ? <div className="empty"><p className="err" style={{ margin: 0 }}>Couldn't load the chart.</p><button className="btn btn-quiet btn-sm" type="button" onClick={candles.reload}>Try again</button></div>
            : <span className="skel" style={{ display: "block", width: "100%", height: 280, borderRadius: 6 }} aria-label="Loading chart" />}</div>
        <section className="panel tex late" aria-label="Trades and holders"><div className="tabs" role="group" aria-label="Show"><button type="button" aria-pressed={tab === "trades"} onClick={() => setTab("trades")}>Trades{t.trades_count ? <span className="faint"> {t.trades_count}</span> : null}</button><button type="button" aria-pressed={tab === "holders"} onClick={() => setTab("holders")}>Holders<span className="faint"> {t.holders}</span></button></div>
          <div className="tscroll">{tab === "trades" ? (
            <table className="dense"><thead><tr className="lbl"><th className="l">Side</th><th className="l">Trader</th><th>HYPE</th><th className="c-hide">${t.symbol}</th><th>Age</th></tr></thead>
              <tbody>{(trades.data?.trades ?? []).map((x) => <tr key={x.tx_hash + x.log_index}><td className={`l ${x.side === "buy" ? "up" : "down"}`}>{x.side === "buy" ? "Buy" : "Sell"}</td><td className="l">{who(x.signer || x.trader)}</td><td>{fromWei(x.quote_amount).toFixed(3)}</td><td className="c-hide">{amount(fromWei(x.token_amount))}</td><td className="muted">{since(x.at)}</td></tr>)}</tbody></table>
          ) : (
            <table className="dense"><thead><tr className="lbl"><th className="l">#</th><th className="l">Holder</th><th>Share</th></tr></thead>
              <tbody>{(holders.data?.holders ?? []).map((h, i) => <tr key={h.holder}><td className="l faint">{i + 1}</td><td className="l">{h.holder === t.curve.toLowerCase() ? <span className="muted">Bonding curve</span> : who(h.holder)}</td><td>{((fromWei(h.amount) / fromWei(t.supply)) * 100).toFixed(2)}%</td></tr>)}</tbody></table>
          )}
          {sub.loading && !sub.data && <div className="empty"><span className="skel" style={{ width: "60%" }} /></div>}
          {sub.error && <div className="empty"><p className="err" style={{ margin: 0 }}>Couldn't load {tab}.</p><button className="btn btn-quiet btn-sm" type="button" onClick={sub.reload}>Try again</button></div>}
          {tab === "trades" && trades.data?.trades.length === 0 && <div className="empty">No trades yet. The first buy sets the price.</div>}
          {tab === "holders" && holders.data?.holders.length === 0 && <div className="empty">No holders yet.</div>}</div></section>
        {t.description && <div className="panel tex about late"><span className="lbl">About</span><p>{t.description}</p></div>}
      </div><div className="tside"><TradePanel t={t} /><PerpsFund t={t} /></div></div>
      <MobileTradeBar symbol={t.symbol} />
    </div>
  );
}

/** Progress of this token's perps fund, once the server reports it. How it's funded is on /docs#perps. Perps are not live yet. */
function PerpsFund({ t }: { t: Token }) {
  if (t.perps_fund_hype == null || !t.perps_fund_target_hype) return null;
  const have = Number(t.perps_fund_hype), need = Number(t.perps_fund_target_hype);
  if (!Number.isFinite(have) || !Number.isFinite(need) || need <= 0) return null;
  const full = have >= need;
  return (
    <section className={`panel tex perps-fund ${full ? "is-full" : ""}`} aria-label="Perps fund">
      <div className="box-row"><span className="lbl">Perps fund<span className="soon">Soon</span></span><span className={`pf-pill ${full ? "is-full" : ""}`}>{full ? "Target reached" : `${Math.floor((have / need) * 100)}% funded`}</span></div>
      <div className="pf-amt"><span className="mono">{have.toFixed(1)}</span> <span className="faint mono">/ {need.toFixed(0)} HYPE</span></div>
      <Progress value={(have / need) * 100} label="Perps fund progress" />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Part of Eden's fee on every trade is saved toward listing this token on perps. Perps are coming soon. <Link to="/docs#perps">How it works</Link></p>
    </section>
  );
}

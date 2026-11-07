import { useEffect, useRef, useState } from "react";
import { api, type Tab, type Token } from "../lib/api";
import { imageFor } from "../lib/art";
import { ago, fromWei, pct, usd, usdFull } from "../lib/format";
import { useLive, useLiveStatus } from "../lib/live";
import { I } from "../components/icons";
import { Link, navigate } from "../components/router";
import { TokenImage, useData } from "../components/ui";
import { Creator } from "../components/Creator";

const TABS: Array<{ id: string; label: string; tab: Tab; sort?: string }> = [
  { id: "mcap", label: "Market cap", tab: "trending", sort: "market_cap" },
  { id: "new", label: "New", tab: "new" },
  { id: "active", label: "Active", tab: "trending", sort: "volume_1h" },
  { id: "near", label: "Near graduation", tab: "graduating" },
  { id: "grad", label: "Graduated", tab: "graduated" },
];

function Spark({ address, up }: { address: string; up: boolean }) {
  const { data } = useData(() => api.candles(address, "1h", new Date(Date.now() - 24 * 3600_000)), [address]);
  const closes = (data?.candles ?? []).map((c) => Number(c.close));
  if (closes.length < 2) return <svg width="106" height="28" aria-hidden="true"><line x1="0" x2="106" y1="14" y2="14" stroke="var(--rule-2)" strokeDasharray="2 4" /></svg>;
  const lo = Math.min(...closes), hi = Math.max(...closes), span = hi - lo || 1;
  const pts = closes.map((v, i) => `${(i / (closes.length - 1)) * 106},${26 - ((v - lo) / span) * 24}`).join(" ");
  return <svg width="106" height="28" viewBox="0 0 106 28" aria-hidden="true"><polyline fill="none" stroke={up ? "var(--accent)" : "var(--down)"} strokeWidth="1.4" strokeLinejoin="round" points={pts} /></svg>;
}

function GradCell({ t }: { t: Token }) {
  if (t.phase !== "curve") return <span className="done"><i />Graduated</span>;
  const p = Math.round(t.graduation_progress * 100);
  return <span className="grad"><span className="track"><span className="fill" style={{ width: `${p}%` }} /></span><span className="pct">{p}%</span></span>;
}

export function Explore({ search }: { search: string }) {
  const [tab, setTab] = useState(TABS[0]!);
  const [limit, setLimit] = useState(50);
  const rail = useRef<HTMLDivElement>(null);
  const live = useLiveStatus();
  const list = useData(() => api.tokens({ tab: tab.tab, sort: tab.sort, q: search.trim() || undefined, limit }), [tab.id, search, limit]);
  const trending = useData(() => api.tokens({ tab: "trending", sort: "volume_24h", limit: 9 }), []);
  // Live: refresh at most every 2 s while trades and launches arrive.
  const pending = useRef<ReturnType<typeof setTimeout>>();
  useLive("feed", () => {
    if (pending.current) return;
    pending.current = setTimeout(() => { pending.current = undefined; list.reload(); trending.reload(); }, 2000);
  });
  useEffect(() => () => clearTimeout(pending.current), []);
  const rows = list.data?.tokens ?? [];
  return (
    <div className="wrap">
      <section className="hero" aria-label="Eden">
        <h1>Every token starts in Eden.</h1>
        <p>Launch a token in one transaction. It trades from the first second and graduates at about $72K into a locked Uniswap pool on Elysium.</p>
        <Link className="btn btn-launch" to="/create">{I.plus()}Launch a token</Link>
      </section>
      <section className="sec" aria-label="Trending">
        <div className="sec-row"><h2>Trending</h2>
          <div className="arrows">
            <button className="iconbtn" type="button" aria-label="Previous" onClick={() => rail.current?.scrollBy({ left: -620, behavior: "smooth" })}>{I.back()}</button>
            <button className="iconbtn" type="button" aria-label="Next" onClick={() => rail.current?.scrollBy({ left: 620, behavior: "smooth" })}>{I.next()}</button>
          </div></div>
        <div className="rail" ref={rail}>
          {(trending.data?.tokens ?? []).map((t, i) => (
            <button key={t.address} className="tc" type="button" onClick={() => navigate(`/token/${t.address}`)}>
              <div className="tc-art" role="img" aria-label={t.name} style={{ backgroundImage: `url(${imageFor(t.address, t.logo, 640, 360)})`, backgroundSize: "cover" }}><span className="tc-rank">{i + 1}</span></div>
              <div className="tc-cap"><span className="tk">${t.symbol}</span><span className="k">Market cap</span>
                <span className="sub"><Creator t={t} compact /> · <span className={`mono ${t.change_24h >= 0 ? "cap-up" : "cap-down"}`}>{pct(t.change_24h)}</span></span>
                <span className="v">{usdFull(t.market_cap_usd)}</span></div>
            </button>
          ))}
          {trending.loading && !trending.data && [0, 1, 2].map((i) => <div key={i} className="tc"><div className="tc-art" style={{ background: "var(--raised)" }} /><div className="tc-cap"><span className="skel" /></div></div>)}
        </div>
      </section>
      <section className="panel tex" aria-label="All tokens">
        <div className="tabs" role="group" aria-label="Sort">
          {TABS.map((t) => <button key={t.id} type="button" aria-pressed={t.id === tab.id} onClick={() => { setTab(t); setLimit(50); }}>{t.label}</button>)}
          <span style={{ marginLeft: "auto", alignSelf: "center" }} className={`live ${live ? "" : "off"}`}><i />{live ? "Live" : "Reconnecting"}</span>
        </div>
        <div className="tscroll">
          <table>
            <thead><tr className="lbl"><th className="l">#</th><th className="l">Token</th><th className="c-hide">Last 24h</th><th>Market cap</th><th>24h</th><th className="c-hide">Volume</th><th className="c-hide">Graduation</th></tr></thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={t.address} className="link" tabIndex={0} onClick={() => navigate(`/token/${t.address}`)} onKeyDown={(e) => e.key === "Enter" && navigate(`/token/${t.address}`)}>
                  <td className="l faint" style={{ width: 32, fontSize: 12 }}>{i + 1}</td>
                  <td className="l"><div className="tok"><TokenImage address={t.address} logo={t.logo} size={42} label={t.name} /><div><div className="t">${t.symbol}</div><div className="n">{t.name} · <Creator t={t} compact /> · {ago(t.launched_at)}</div></div></div></td>
                  <td className="c-hide"><Spark address={t.address} up={t.change_24h >= 0} /></td>
                  <td>{usd(t.market_cap_usd ?? fromWei(t.market_cap_quote))}</td>
                  <td className={t.change_24h >= 0 ? "up" : "down"}>{pct(t.change_24h)}</td>
                  <td className="c-hide">{usd(t.volume_24h_usd)}</td>
                  <td className="c-hide"><GradCell t={t} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.error && <div className="empty err">{list.error}</div>}
          {!list.error && !list.loading && rows.length === 0 && <div className="empty">{search ? `No token matches “${search}”. Try a ticker or paste a contract address.` : "No tokens here yet. Launch the first one."}</div>}
          {list.loading && !list.data && <div className="empty"><span className="skel" /></div>}
        </div>
        {list.data && list.data.total > rows.length && <div className="more"><button className="btn btn-quiet btn-sm" type="button" onClick={() => setLimit((l) => l + 50)}>Show more</button></div>}
      </section>
      <p className="faint" style={{ margin: "-24px 0 0", fontSize: 12 }}>{list.data ? `${list.data.total} tokens · HYPE ${list.data.hypeUsd ? "$" + list.data.hypeUsd.toFixed(2) : "price loading"}` : ""}</p>
    </div>
  );
}

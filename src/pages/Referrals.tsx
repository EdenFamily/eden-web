import { useState } from "react";
import { api } from "../lib/api";
import { fromWei, hype, short, since } from "../lib/format";
import { I } from "../components/icons";
import { Gate } from "./Portfolio";
import { signMessage, useWallet } from "../lib/wallet";
import { Copy, toast, useData } from "../components/ui";

export function Referrals() {
  const w = useWallet();
  const [tab, setTab] = useState<"w" | "p">("w");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [codeErr, setCodeErr] = useState("");
  const r = useData(() => (w.address ? api.referral(w.address.toLowerCase()) : Promise.resolve(undefined)), [w.address]);
  if (!w.address) return (
    <div className="wrap"><div className="head"><h1>Referrals</h1></div>
      <Gate icon={I.referrals(22)} title="Earn from every trade your friends make" body="Get a link, share it, and earn 25% of Eden's fee on every trade from wallets that join through it. Paid daily in HYPE." /></div>
  );
  const s = r.data?.referral;
  const link = s?.code ? `${location.origin}/?ref=${s.code}` : "";
  async function claim() {
    const c = code.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{2,23}$/.test(c)) return setCodeErr("Use 3 to 24 characters: letters a–z, digits, - or _, starting with a letter or digit.");
    setCodeErr("");
    setBusy(true);
    try {
      const { message } = await api.codeMessage(w.address!, c);
      await api.claimCode(w.address!, c, await signMessage(message));
      toast("Your link is ready"); r.reload();
    } catch (e) { const m = (e as Error).message; setCodeErr(/rejected|denied/i.test(m) ? "You declined the signature. Nothing was saved." : m.split("\n")[0]!); } finally { setBusy(false); }
  }
  return (
    <div className="wrap">
      <div className="head"><h1>Referrals</h1></div>
      {s?.code ? (
        <div className="panel tex reflink"><span className="url">{link}</span><Copy value={link} label="Copy referral link" /></div>
      ) : (
        <form className="panel tex reflink" onSubmit={(e) => { e.preventDefault(); void claim(); }} noValidate>
          <label className="affix" style={{ flex: 1, minWidth: 220 }}><span aria-hidden="true" style={{ fontSize: 13 }}>?ref=</span>
            <input className="input mono" style={{ paddingLeft: 58 }} placeholder="aether" value={code} onChange={(e) => { setCode(e.target.value); setCodeErr(""); }} aria-label="Your referral code" aria-invalid={!!codeErr} aria-describedby="code-help" autoComplete="off" spellCheck={false} maxLength={24} /></label>
          <button className="btn btn-primary" type="submit" disabled={busy || !code.trim()}>{busy ? "Sign the message in your wallet" : "Create my link"}</button>
          <p className={codeErr ? "field-err" : "help"} id="code-help" role={codeErr ? "alert" : undefined} style={{ flexBasis: "100%", margin: 0 }}>{codeErr || "Pick a short code people will recognise. Signing is free and only proves the wallet is yours."}</p>
        </form>
      )}
      <p className="help" style={{ marginTop: -32 }}>You earn 25% of Eden's fee on every trade your referrals make. Paid daily in HYPE, once you've earned 0.01 HYPE.</p>
      <div className="stats">
        <div className="panel tex stat"><span className="lbl">Referred</span><span className="v">{s?.referred_wallets ?? "—"}</span></div>
        <div className="panel tex stat"><span className="lbl">Their volume</span><span className="v">{s ? hype(fromWei(s.referred_volume_quote)) : "—"}</span></div>
        <div className="panel tex stat"><span className="lbl">Earned</span><span className="v">{s ? hype(fromWei(s.earned_quote)) : "—"}</span><span className="d muted">{s && fromWei(s.pending_quote) > 0 ? `${hype(fromWei(s.pending_quote))} pays out next` : ""}</span></div>
      </div>
      <section className="panel tex">
        <div className="tabs" role="group"><button type="button" aria-pressed={tab === "w"} onClick={() => setTab("w")}>Wallets</button><button type="button" aria-pressed={tab === "p"} onClick={() => setTab("p")}>Payouts</button></div>
        <div className="tscroll">
          {tab === "w" ? <table><thead><tr className="lbl"><th className="l">Wallet</th><th>Joined</th><th>Volume</th><th>You earned</th></tr></thead><tbody>
            {(s?.wallets ?? []).map((x) => <tr key={x.wallet}><td className="l">{short(x.wallet)}</td><td className="muted">{since(x.bound_at)}</td><td>{hype(fromWei(x.volume_quote))}</td><td>{hype(fromWei(x.earned_quote))}</td></tr>)}
          </tbody></table> : <table><thead><tr className="lbl"><th className="l">Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>
            {(s?.payouts ?? []).map((p) => <tr key={p.id}><td className="l">{new Date(p.created_at).toLocaleDateString()}</td><td>{hype(fromWei(p.amount))}</td><td className={p.status === "confirmed" ? "up" : p.status === "failed" ? "down" : "muted"}>{p.status === "confirmed" ? "Paid" : p.status === "failed" ? "Retrying" : "Sending"}</td></tr>)}
          </tbody></table>}
          {r.loading && !r.data && <div className="empty"><span className="skel" style={{ width: "60%" }} /></div>}
          {r.error && <div className="empty"><p className="err" style={{ margin: 0 }}>Couldn't load your referrals. {r.error}</p><button className="btn btn-quiet btn-sm" type="button" onClick={r.reload}>Try again</button></div>}
          {s && tab === "w" && s.wallets.length === 0 && <div className="empty">No one has joined with your link yet. Share it, or use Share on any token page: those links carry your code too.</div>}
          {s && tab === "p" && s.payouts.length === 0 && <div className="empty">No payouts yet. They start once you've earned 0.01 HYPE.</div>}
        </div>
      </section>
    </div>
  );
}

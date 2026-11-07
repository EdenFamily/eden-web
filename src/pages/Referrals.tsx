import { useState } from "react";
import { api } from "../lib/api";
import { ago, fromWei, hype, short } from "../lib/format";
import { signMessage, useWallet } from "../lib/wallet";
import { askToConnect } from "../components/Shell";
import { Copy, toast, useData } from "../components/ui";

export function Referrals() {
  const w = useWallet();
  const [tab, setTab] = useState<"w" | "p">("w");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const r = useData(() => (w.address ? api.referral(w.address.toLowerCase()) : Promise.resolve(undefined)), [w.address]);
  if (!w.address) return (
    <div className="wrap"><div className="head"><h1>Referrals</h1></div>
      <div className="panel tex empty"><p style={{ margin: "0 0 16px" }}>Earn 25% of Eden's fee on every trade your referrals make, paid daily in HYPE.</p><button className="btn btn-primary" type="button" onClick={(e) => { e.stopPropagation(); askToConnect(); }}>Sign in</button></div></div>
  );
  const s = r.data?.referral;
  const link = s?.code ? `${location.origin}/?ref=${s.code}` : "";
  async function claim() {
    const c = code.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{2,23}$/.test(c)) return toast("Codes are 3–24 characters: a–z, 0–9, - and _.", "err");
    setBusy(true);
    try {
      const { message } = await api.codeMessage(w.address!, c);
      await api.claimCode(w.address!, c, await signMessage(message));
      toast("Your link is ready"); r.reload();
    } catch (e) { toast((e as Error).message.split("\n")[0]!, "err"); } finally { setBusy(false); }
  }
  return (
    <div className="wrap">
      <div className="head"><h1>Referrals</h1></div>
      {s?.code ? (
        <div className="panel tex reflink"><span className="url">{link}</span><Copy value={link} label="Copy referral link" /></div>
      ) : (
        <form className="panel tex reflink" onSubmit={(e) => { e.preventDefault(); void claim(); }}>
          <input className="input mono" style={{ flex: 1, minWidth: 220 }} placeholder="Pick your code, e.g. aether" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Referral code" />
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Sign in your wallet" : "Create link"}</button>
        </form>
      )}
      <p className="help" style={{ marginTop: -32 }}>You earn 25% of Eden's fee on every trade your referrals make. Paid daily in HYPE.</p>
      <div className="stats">
        <div className="panel tex stat"><span className="lbl">Referred</span><span className="v">{s?.referred_wallets ?? "—"}</span></div>
        <div className="panel tex stat"><span className="lbl">Their volume</span><span className="v">{s ? hype(fromWei(s.referred_volume_quote)) : "—"}</span></div>
        <div className="panel tex stat"><span className="lbl">Earned</span><span className="v">{s ? hype(fromWei(s.earned_quote)) : "—"}</span><span className="d muted">{s && fromWei(s.pending_quote) > 0 ? `${hype(fromWei(s.pending_quote))} pays out next` : ""}</span></div>
      </div>
      <section className="panel tex">
        <div className="tabs" role="group"><button type="button" aria-pressed={tab === "w"} onClick={() => setTab("w")}>Wallets</button><button type="button" aria-pressed={tab === "p"} onClick={() => setTab("p")}>Payouts</button></div>
        <div className="tscroll">
          {tab === "w" ? <table><thead><tr className="lbl"><th className="l">Wallet</th><th>Joined</th><th>Volume</th><th>You earned</th></tr></thead><tbody>
            {(s?.wallets ?? []).map((x) => <tr key={x.wallet}><td className="l">{short(x.wallet)}</td><td className="muted">{ago(x.bound_at)} ago</td><td>{hype(fromWei(x.volume_quote))}</td><td>{hype(fromWei(x.earned_quote))}</td></tr>)}
          </tbody></table> : <table><thead><tr className="lbl"><th className="l">Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>
            {(s?.payouts ?? []).map((p) => <tr key={p.id}><td className="l">{new Date(p.created_at).toLocaleDateString()}</td><td>{hype(fromWei(p.amount))}</td><td className={p.status === "confirmed" ? "up" : p.status === "failed" ? "down" : "muted"}>{p.status === "confirmed" ? "Paid" : p.status === "failed" ? "Retrying" : "Sending"}</td></tr>)}
          </tbody></table>}
          {s && tab === "w" && s.wallets.length === 0 && <div className="empty">No one has joined with your link yet.</div>}
          {s && tab === "p" && s.payouts.length === 0 && <div className="empty">No payouts yet. They start once you've earned 0.01 HYPE.</div>}
        </div>
      </section>
    </div>
  );
}

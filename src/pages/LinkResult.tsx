import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { signMessage, useWallet } from "../lib/wallet";
import { navigate } from "../components/router";
import { askToConnect } from "../components/Shell";
import { toast } from "../components/ui";
import { I } from "../components/icons";

const ERRORS: Record<string, string> = {
  state: "Linking timed out. Start again from the wallet menu.",
  denied: "You cancelled on the platform. Nothing was linked.",
  taken: "That account is already linked to another Eden wallet.",
  already_linked: "This wallet already has an account from that platform linked.",
  failed: "The platform didn't answer. Try again in a minute.",
};

/** Where X / TikTok send the user back: the wallet signs the link offer, then the server stores it permanently. */
export function LinkResult() {
  const w = useWallet();
  const q = new URLSearchParams(location.search);
  const offer = q.get("offer"), linkError = q.get("link_error");
  const [state, setState] = useState<{ text: string; tone: "info" | "ok" | "err" }>(
    linkError ? { text: ERRORS[linkError] ?? ERRORS.failed!, tone: "err" } : { text: "Checking the link…", tone: "info" });
  useEffect(() => {
    if (!offer || linkError) return;
    if (!w.address) { setState({ text: "Connect the wallet you started from to finish linking.", tone: "info" }); return; }
    let done = false;
    void (async () => {
      try {
        const m = await api.linkMessage(offer);
        if (m.wallet.toLowerCase() !== w.address!.toLowerCase()) throw new Error("Switch to the wallet you started linking from.");
        setState({ text: `Sign in your wallet to link @${m.handle}.`, tone: "info" });
        const res = await api.link(offer, w.address!, await signMessage(m.message));
        if (done) return;
        setState({ text: `${res.platform === "x" ? "X" : "TikTok"} linked: @${res.handle}. It now shows as the creator on your tokens.`, tone: "ok" });
        toast(`Linked @${res.handle}`);
      } catch (e) {
        const msg = (e as Error).message;
        setState({ text: /rejected|denied/i.test(msg) ? "You declined the signature. Nothing was linked." : msg.split("\n")[0]!, tone: "err" });
      }
    })();
    return () => { done = true; };
  }, [offer, linkError, w.address]);
  return (
    <div className="wrap">
      <div className="head"><h1>Link account</h1></div>
      <div className="panel tex state" aria-live="polite">
        <span className="glyph" aria-hidden="true" style={state.tone === "ok" ? { color: "var(--accent)" } : state.tone === "err" ? { color: "var(--down)" } : undefined}>
          {state.tone === "ok" ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
            : state.tone === "err" ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 7v6M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
            : !offer ? I.x(20) : <span className="ws-spin" />}</span>
        <h2>{state.tone === "ok" ? "Account linked" : state.tone === "err" ? "Not linked" : !offer ? "Link your X account" : "Linking your account"}</h2>
        <p>{!offer && !linkError ? "Connect your wallet, open the wallet menu (your address, top right) and choose Link X. You'll come back here to sign once." : state.text}</p>
        <div className="row">
          {!w.address && !linkError ? <button className="btn btn-primary" type="button" onClick={(e) => { e.stopPropagation(); askToConnect(); }}>{I.wallet(16)}Connect wallet</button>
            : state.tone === "err" ? <><button className="btn btn-primary" type="button" onClick={(e) => { e.stopPropagation(); askToConnect(); }}>Open the wallet menu</button><button className="btn btn-quiet" type="button" onClick={() => navigate("/")}>Back to Explore</button></>
            : <button className="btn btn-quiet" type="button" onClick={() => navigate("/")}>Back to Explore</button>}
        </div>
      </div>
    </div>
  );
}

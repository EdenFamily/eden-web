import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { signMessage, useWallet } from "../lib/wallet";
import { navigate } from "../components/router";
import { askToConnect } from "../components/Shell";
import { toast } from "../components/ui";

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
    if (!w.address) { setState({ text: "Sign in with the wallet you started from to finish linking.", tone: "info" }); return; }
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
      <div className="panel tex empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <p className={state.tone === "err" ? "err" : ""} style={{ margin: 0, fontSize: 15, color: state.tone === "ok" ? "var(--accent)" : undefined }}>{state.text}</p>
        {!w.address && !linkError ? <button className="btn btn-primary" type="button" onClick={(e) => { e.stopPropagation(); askToConnect(); }}>Sign in</button>
          : <button className="btn btn-quiet" type="button" onClick={() => navigate("/")}>Back to Explore</button>}
      </div>
    </div>
  );
}

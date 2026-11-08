import { useState, type FormEvent } from "react";
import { api, type BuilderRequest } from "../lib/api";
import { useWallet } from "../lib/wallet";

const SUPPORT = "support@edenfamily.xyz";
const NEEDS = [
  ["technical", "Technical support"], ["marketing", "Marketing"], ["ecosystem", "Ecosystem alignment"],
  ["partnership", "Partnership or integration"], ["other", "Something else"],
] as const;

/** The form as an email, for when the server can't take it (before launch, or not connected). */
function mailto(r: BuilderRequest): string {
  const label = Object.fromEntries(NEEDS);
  const body = [`Token: ${r.onEden ? "on Eden" : "not on Eden"}`, r.contract && `Contract: ${r.contract}`, r.tokenName && `Token name: ${r.tokenName}`,
    `Needs: ${r.needs.map((n) => label[n as keyof typeof label]).join(", ")}`, "", r.about && `About the project: ${r.about}`, r.asking && `Asking for: ${r.asking}`, "",
    r.name && `Name: ${r.name}`, r.email && `Email: ${r.email}`, r.social && `X / Telegram: ${r.social}`, r.website && `Website: ${r.website}`,
  ].filter((l) => l !== undefined).join("\n");
  return `mailto:${SUPPORT}?subject=${encodeURIComponent("Builders request" + (r.tokenName ? `: ${r.tokenName}` : ""))}&body=${encodeURIComponent(body)}`;
}

/** /builders: teams building on Eden, and projects that want to work with us. Sent to the team, never stored. */
export function Builders() {
  const w = useWallet();
  const [onEden, setOnEden] = useState(true);
  const [needs, setNeeds] = useState<string[]>([]);
  const [state, setState] = useState<{ at: "idle" | "sending" | "sent" } | { at: "error"; message: string; mail?: string }>({ at: "idle" });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim() || undefined;
    if (!needs.length) return setState({ at: "error", message: "Choose at least one thing you need." });
    if (!v("email") && !v("social")) return setState({ at: "error", message: "Give an email or an X / Telegram handle so the team can reply." });
    const r: BuilderRequest = { onEden, contract: v("contract"), tokenName: v("tokenName"), needs, about: v("about"), asking: v("asking"),
      name: v("name"), email: v("email"), social: v("social"), website: v("website"), wallet: w.address, company: v("company") };
    setState({ at: "sending" });
    try {
      const res = await api.builders(r);
      if (res.status !== "sent") throw new Error("The Eden server answered without confirming.");
      setState({ at: "sent" });
    }
    catch (err) { setState({ at: "error", message: (err as Error).message.includes("Failed to fetch") || (err as Error).message.includes("answered") ? "The form can't reach the team right now." : (err as Error).message, mail: mailto(r) }); }
  }

  if (state.at === "sent") return (
    <div className="wrap builders"><div className="panel bd-done" role="status"><h1>Sent to the team</h1><p className="muted">Thanks. We read every request and will reply by email or on X / Telegram.</p></div></div>
  );
  return (
    <div className="wrap builders">
      <header className="bd-head"><h1>Builders</h1><p className="muted">For teams building on Eden, and projects that want to work with us. Tell us what you need and the team will be in touch.</p></header>
      <form className="bd-form" onSubmit={(e) => void submit(e)} noValidate>
        <fieldset className="panel bd-sec"><legend>Your token</legend>
          <div className="seg" role="radiogroup" aria-label="Is your token on Eden">
            <button type="button" role="radio" aria-checked={onEden} className={onEden ? "on" : ""} onClick={() => setOnEden(true)}>On Eden</button>
            <button type="button" role="radio" aria-checked={!onEden} className={!onEden ? "on" : ""} onClick={() => setOnEden(false)}>Not on Eden</button>
          </div>
          <label className="field" htmlFor="bd-contract"><span>Contract address</span><input id="bd-contract" name="contract" className="input mono" placeholder="0x…" autoComplete="off" spellCheck={false} />
            <small>{w.address ? `Sent with your connected wallet ${w.address.slice(0, 6)}…${w.address.slice(-4)}, which shows the token is yours if it launched it.` : "Connect the wallet that launched it to show it is yours."}</small></label>
          <label className="field" htmlFor="bd-name-token"><span>Token name</span><input id="bd-name-token" name="tokenName" className="input" maxLength={80} /></label>
        </fieldset>
        <fieldset className="panel bd-sec"><legend>What you need <b aria-hidden="true">*</b></legend>
          <div className="bd-chips">{NEEDS.map(([id, label]) => {
            const on = needs.includes(id);
            return <button key={id} type="button" aria-pressed={on} className={`chip ${on ? "on" : ""}`} onClick={() => setNeeds(on ? needs.filter((n) => n !== id) : [...needs, id])}>{label}</button>;
          })}</div>
        </fieldset>
        <fieldset className="panel bd-sec"><legend>The project</legend>
          <label className="field" htmlFor="bd-about"><span>About the project</span><textarea id="bd-about" name="about" className="input" rows={4} maxLength={2000} /></label>
          <label className="field" htmlFor="bd-asking"><span>What you are asking for</span><textarea id="bd-asking" name="asking" className="input" rows={4} maxLength={2000} /></label>
        </fieldset>
        <fieldset className="panel bd-sec"><legend>Contact details</legend>
          <div className="bd-two">
            <label className="field" htmlFor="bd-name"><span>Your name</span><input id="bd-name" name="name" className="input" maxLength={80} autoComplete="name" /></label>
            <label className="field" htmlFor="bd-email"><span>Email</span><input id="bd-email" name="email" type="email" className="input" maxLength={160} autoComplete="email" /></label>
            <label className="field" htmlFor="bd-social"><span>X or Telegram</span><input id="bd-social" name="social" className="input" maxLength={80} placeholder="@handle" /></label>
            <label className="field" htmlFor="bd-site"><span>Website</span><input id="bd-site" name="website" type="url" className="input" maxLength={200} placeholder="https://" /></label>
          </div>
          <input className="bd-hp" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        </fieldset>
        {state.at === "error" && <p className="bd-err" role="alert">{state.message}{state.mail && <> <a href={state.mail}>Send it by email instead</a>, or write to {SUPPORT}.</>}</p>}
        <div className="bd-actions"><button className="btn btn-primary" type="submit" disabled={state.at === "sending"}>{state.at === "sending" ? "Sending…" : "Send to the team"}</button>
          <span className="faint">Sent straight to the team. Nothing is stored on this site.</span></div>
      </form>
    </div>
  );
}

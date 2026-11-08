import { useMemo, useRef, useState, type FormEvent } from "react";
import { decodeEventLog, keccak256, parseUnits, toHex, zeroAddress, type Address, type Hex } from "viem";
import { contracts, factoryAbi, LAUNCH_FEE_WEI, launchAndBuyAbi } from "../lib/chain";
import { initialBuyShare } from "../lib/curve";
import { short } from "../lib/format";
import { send, useWallet } from "../lib/wallet";
import { navigate } from "../components/router";
import { askToConnect } from "../components/Shell";
import { toast, useData } from "../components/ui";
import { api } from "../lib/api";
import { GRADUATION_HYPE } from "../lib/deployment";
import { ipfsImage } from "../lib/art";
import { prepareImage, uploadImage } from "../lib/upload";

const FEES = [0, 1, 2, 3, 5, 10];
const ZERO32 = ("0x" + "0".repeat(64)) as Hex;
const isAddr = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);

export function Create() {
  const w = useWallet();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name: "", ticker: "", description: "", x: "", telegram: "", website: "" });
  /** the chosen image: a local preview while it uploads, then its ipfs:// logo (shown from Eden's image cache) */
  const [img, setImg] = useState<{ preview: string; logo?: string; progress: number; error?: string }>();
  const pickId = useRef(0);
  const uploading = !!img && !img.logo && !img.error;
  const [fee, setFee] = useState(1);
  const [buy, setBuy] = useState("1");
  const [buyback, setBuyback] = useState(true);
  const [bundle, setBundle] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const quota = useData(() => (w.address ? api.quota(w.address.toLowerCase()) : Promise.resolve(undefined)), [w.address]);
  const used = quota.data?.used ?? 0, limit = quota.data?.limit ?? 5, full = !!quota.data && used >= limit;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: k === "ticker" ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") : e.target.value });
  const buyHype = Number(buy) || 0;
  const share = initialBuyShare(buyHype, 100, fee * 100);
  const bundleList = useMemo(() => bundle.split(/\s+/).map((s) => s.trim()).filter(Boolean), [bundle]);
  const badBundle = bundleList.filter((a) => !isAddr(a));
  const initials = f.name.trim().split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase() || "?";

  async function pick(file: File) {
    const id = ++pickId.current;
    const mine = (patch: Partial<NonNullable<typeof img>>) => { if (pickId.current === id) setImg((s) => ({ preview: "", progress: 0, ...s, ...patch })); };
    setImg({ preview: URL.createObjectURL(file), progress: 0 });
    try {
      const prepared = await prepareImage(file);
      mine({ preview: URL.createObjectURL(prepared) });
      const logo = await uploadImage(prepared, (p) => mine({ progress: p }));
      mine({ logo, progress: 1, preview: ipfsImage(logo) });
    } catch (e) { mine({ error: (e as Error).message }); }
  }

  function next(e: FormEvent) {
    e.preventDefault();
    const missing = [!img?.logo && !uploading && "an image", !f.name.trim() && "a name", !f.ticker && "a ticker"].filter(Boolean) as string[];
    const list = missing.length > 1 ? `${missing.slice(0, -1).join(", ")} and ${missing.at(-1)}` : missing[0];
    setErr(missing.length ? `Add ${list} to continue.` : uploading ? "Wait for the image to finish uploading." : "");
    if (!missing.length && !uploading) setStep(2);
  }

  async function launch(e: FormEvent) {
    e.preventDefault();
    if (!w.address) return askToConnect();
    if (full) return setErr(`You've launched ${limit} tokens this month. You can launch again on ${new Date(quota.data!.resetsAt).toLocaleDateString()}.`);
    if (badBundle.length) return setErr(`Not an address: ${badBundle[0]}`);
    if (bundleList.length > 31) return setErr("Up to 31 bundle wallets.");
    if (!img?.logo) { setStep(1); return setErr("Add an image to continue."); }
    setErr("");
    const salt = keccak256(toHex(`${w.address}:${f.ticker}:${Date.now()}:${Math.random()}`));
    const params = {
      name: f.name.trim(), symbol: f.ticker, logo: img.logo, description: f.description.trim(),
      socials: { twitter: f.x.trim(), telegram: f.telegram.trim(), discord: "", website: f.website.trim(), farcaster: "" },
      creatorFeeRecipient: w.address, creatorTaxBps: fee * 100, buybackEnabled: buyback, expectedEconomics: ZERO32, salt,
    };
    try {
      setBusy("Confirm in your wallet");
      let receipt;
      if (buyHype > 0) {
        const quoteIn = parseUnits(buy, 18);
        const minOut = parseUnits(String(Math.floor(share * 1e9 * 0.97)), 18);
        receipt = await send(contracts.launchAndBuy, launchAndBuyAbi, "launchAndBuy",
          [params, 0n, zeroAddress, quoteIn, minOut, w.address, bundleList as Address[]], LAUNCH_FEE_WEI + quoteIn);
      } else {
        receipt = await send(contracts.factory, factoryAbi, "launchToken", [params, 0n, zeroAddress, bundleList as Address[]], LAUNCH_FEE_WEI);
      }
      const launched = receipt.logs.map((l) => { try { return decodeEventLog({ abi: factoryAbi, data: l.data, topics: l.topics }); } catch { return undefined; } })
        .find((d) => d?.eventName === "TokenLaunched");
      const token = (launched?.args as { token?: string } | undefined)?.token;
      toast(`$${f.ticker} is live on Eden`);
      if (token) navigate(`/token/${token.toLowerCase()}`);
    } catch (e2) {
      const m = (e2 as Error).message;
      toast(/rejected|denied/i.test(m) ? "Cancelled in your wallet." : m.split("\n")[0]!, "err");
    } finally { setBusy(""); }
  }

  const total = 0.0005 + buyHype;
  return (
    <div className="wrap">
      <div className="head"><h1>Launch a token</h1>
        <div className="steps">
          <span className={step === 1 ? "on" : "ok"}><span className="n">{step === 1 ? 1 : "✓"}</span> Identity</span><span className="line" />
          <span className={step === 2 ? "on" : ""}><span className="n">2</span> Economics</span></div></div>
      <div className="cgrid">
        {step === 1 ? (
          <form className="panel tex form" onSubmit={next} noValidate>
            <div className="field"><div className="field-row"><span>Image</span><span className="c">Required · square works best</span></div>
              <div className="drop"><div className="pv">{img?.preview ? <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "+"}</div>
                <label className="btn btn-quiet btn-sm" htmlFor="img">{img ? "Change image" : "Choose image"}</label>
                <input id="img" type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void pick(file); }} />
                {img && <span className="upl" aria-live="polite">{img.error ? <span className="err">{img.error}</span> : img.logo ? <span className="ok">Uploaded to IPFS</span>
                  : <><span className="upl-bar"><span style={{ width: `${Math.round(img.progress * 100)}%` }} /></span><span className="muted">Uploading {Math.round(img.progress * 100)}%</span></>}</span>}</div>
              <p className="help">PNG, JPEG, GIF or WEBP. Eden crops it to a square and stores it on IPFS with your token.</p></div>
            <div className="two">
              <div className="field"><div className="field-row"><label htmlFor="nm">Name</label><span className="c">{f.name.length}/32</span></div><input className="input" id="nm" maxLength={32} placeholder="Aether" value={f.name} onChange={set("name")} /></div>
              <div className="field"><div className="field-row"><label htmlFor="tk">Ticker</label><span className="c">{f.ticker.length}/10</span></div><input className="input mono" id="tk" maxLength={10} placeholder="AETH" value={f.ticker} onChange={set("ticker")} /></div>
            </div>
            <div className="field"><div className="field-row"><label htmlFor="ds">Description</label><span className="c">{f.description.length}/256</span></div><textarea className="input" id="ds" maxLength={256} placeholder="One or two lines about the token." value={f.description} onChange={set("description")} /></div>
            <div className="three">
              <div className="field"><label className="field-row" htmlFor="sx">X</label><input className="input" id="sx" placeholder="https://x.com/…" value={f.x} onChange={set("x")} /></div>
              <div className="field"><label className="field-row" htmlFor="st">Telegram</label><input className="input" id="st" placeholder="https://t.me/…" value={f.telegram} onChange={set("telegram")} /></div>
              <div className="field"><label className="field-row" htmlFor="sw">Website</label><input className="input" id="sw" placeholder="https://" value={f.website} onChange={set("website")} /></div>
            </div>
            <div className="formfoot"><span className="err">{err}</span><button className="btn btn-primary" type="submit" disabled={uploading}>{uploading ? "Uploading image…" : "Continue"}</button></div>
          </form>
        ) : (
          <form className="panel tex form" onSubmit={(e) => void launch(e)} noValidate>
            <div className="field"><span className="field-row">Creator fee</span>
              <div className="chips">{FEES.map((x) => <button key={x} className="chip" type="button" aria-pressed={x === fee} onClick={() => setFee(x)}>{x}%</button>)}</div>
              <p className="help">Paid to you on every trade, before and after graduation.</p></div>
            <div className="field"><div className="field-row"><label htmlFor="ib">Initial buy <span className="faint">optional</span></label><span className="c">Balance {w.balance != null ? (Number(w.balance) / 1e18).toFixed(2) : "—"} HYPE</span></div>
              <div className="box-row" style={{ gap: 12, flexWrap: "wrap" }}><input className="input mono" id="ib" inputMode="decimal" value={buy} onChange={(e) => setBuy(e.target.value.replace(/[^0-9.]/g, ""))} style={{ maxWidth: 160 }} />
                <div className="chips">{["None", "0.5", "1", "2", "5"].map((x) => <button key={x} className="chip" type="button" onClick={() => setBuy(x === "None" ? "0" : x)}>{x}</button>)}</div></div>
              <p className="help">{buyHype > 0 ? `You'll own about ${(share * 100).toFixed(2)}% at launch, bought in the same transaction.` : "No initial buy. Anyone can buy first."}</p></div>
            <div className="box-row"><div><div style={{ fontWeight: 500 }}>Buyback</div><p className="help">Part of your fee buys back and burns the token.</p></div>
              <button className="switch" type="button" role="switch" aria-checked={buyback} aria-label="Buyback" onClick={() => setBuyback(!buyback)} /></div>
            <details><summary>Bundle wallets <span className="faint">Advanced</span></summary>
              <div className="field" style={{ marginTop: 12 }}><textarea className="input mono" placeholder="One address per line, up to 31. These wallets skip the launch snipe tax." value={bundle} onChange={(e) => setBundle(e.target.value)} />
                {badBundle.length > 0 && <span className="err">Not an address: {badBundle[0]}</span>}</div></details>
            {err && <span className="err">{err}</span>}
            <div className="formfoot"><button className="btn btn-quiet" type="button" onClick={() => setStep(1)}>Back</button>
              <span className="help mono">Total {total.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")} HYPE + gas{quota.data ? ` · ${used}/${limit} launches this month` : ""}</span>
              <button className="btn btn-primary" type="submit" disabled={!!busy || full || !img?.logo}>{busy || (!w.address ? "Sign in to launch" : full ? "Monthly limit reached" : "Launch token")}</button></div>
          </form>
        )}
        <aside className="panel tex board" aria-label="Preview"><span className="lbl">On the board</span>
          <div className="board-tok"><span className="tile" style={{ width: 56, height: 56, fontSize: 18, background: "var(--well)", color: "var(--accent)" }}>{img?.preview ? <img src={img.preview} alt="" /> : initials}</span>
            <div><div style={{ font: "600 18px var(--sans)" }}>{f.name || "Your token"}</div><div className="mono muted">${f.ticker || "TICKER"} · HYPE pair</div>
              {w.address && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>by <span className="mono">{short(w.address)}</span></div>}</div></div>
          <p className="muted" style={{ margin: 0 }}>{f.description || "A line or two about the token goes here."}</p>
          <dl><div><dt>Supply</dt><dd>1,000,000,000</dd></div><div><dt>Graduates at</dt><dd>{GRADUATION_HYPE.toFixed(2)} HYPE</dd></div><div><dt>Creator fee</dt><dd>{fee}%</dd></div><div><dt>Launch fee</dt><dd>0.0005 HYPE</dd></div></dl>
        </aside>
      </div>
    </div>
  );
}

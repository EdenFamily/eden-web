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
import { prepareImage, uploadImage } from "../lib/upload";
import { ipfsImage } from "../lib/art";
import { useGraduationMcapLabel } from "../lib/graduation";
import { LinkXNudge } from "../components/LinkXNudge";

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
  const gradLabel = useGraduationMcapLabel();
  const quota = useData(() => (w.address ? api.quota(w.address.toLowerCase()) : Promise.resolve(undefined)), [w.address]);
  // Up to 2 launches a UTC day and 10 a UTC month per creator (the server counts both).
  const used = quota.data?.used ?? 0, limit = quota.data?.limit ?? 10;
  const usedToday = quota.data?.usedToday ?? 0, dailyLimit = quota.data?.dailyLimit ?? 2;
  const monthFull = !!quota.data && used >= limit, dayFull = !!quota.data && !monthFull && usedToday >= dailyLimit;
  const full = monthFull || dayFull;
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
      // keep showing the local, already-cropped preview: it is the same image, and it never waits on an IPFS gateway
      mine({ logo, progress: 1, preview: ipfsImage(logo) });
    } catch (e) { mine({ error: (e as Error).message }); }
  }

  /** Field errors show once Continue was pressed, next to the field they belong to. */
  const [tried, setTried] = useState(false);
  const fieldErr = {
    img: tried && !img?.logo && !uploading ? (img?.error ? "Choose another image." : "Add an image. Square works best.") : "",
    nm: tried && !f.name.trim() ? "Give your token a name." : "",
    tk: tried && !f.ticker ? "Add a ticker: up to 10 letters or digits." : "",
  };
  function next(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    const bad = [!img?.logo && !uploading && "img", !f.name.trim() && "nm", !f.ticker && "tk"].filter(Boolean) as string[];
    setErr(bad.length ? "" : uploading ? "Wait for the image to finish uploading." : "");
    if (bad.length) { document.getElementById(bad[0] === "img" ? "img-drop" : bad[0]!)?.focus(); return; }
    if (!uploading) { setErr(""); setStep(2); }
  }
  const [over, setOver] = useState(false);
  const drop = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(true); },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setOver(false); const file = e.dataTransfer.files?.[0]; if (file?.type.startsWith("image/")) void pick(file); },
  };

  async function launch(e: FormEvent) {
    e.preventDefault();
    if (!w.address) return askToConnect();
    if (full) return setErr(dayFull ? `You've used today's ${dailyLimit} launches. You can launch again ${resets}.` : `You've used all ${limit} launches for this month. You can launch again ${resets}.`);
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

  const launchFee = Number(LAUNCH_FEE_WEI) / 1e18;
  const total = launchFee + buyHype;
  const hypeFmt = (n: number) => n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  const balance = w.balance != null ? Number(w.balance) / 1e18 : undefined;
  const short4Balance = balance != null && total > balance;
  const resets = !quota.data ? "" : dayFull
    ? `at ${new Date(quota.data.dailyResetsAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : `on ${new Date(quota.data.resetsAt).toLocaleDateString([], { month: "long", day: "numeric", timeZone: "UTC" })}`;
  const limitNote = full && <div className="notice" role="status"><i aria-hidden="true" /><span><b>{dayFull ? `You've used today's ${dailyLimit} launches.` : `You've used all ${limit} launches for this month.`}</b> You can launch again {resets}. <a href="/docs#create">How launches are counted</a></span></div>;
  return (
    <div className="wrap">
      <div className="head"><h1>Launch a token</h1>
        <ol className="steps" aria-label="Steps" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          <li className={step === 1 ? "on" : "ok"} aria-current={step === 1 ? "step" : undefined} style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="n">{step === 1 ? 1 : "✓"}</span> Identity</li><li className="line" aria-hidden="true" />
          <li className={step === 2 ? "on" : ""} aria-current={step === 2 ? "step" : undefined} style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="n">2</span> Economics</li></ol></div>
      <div className="cgrid">
        {step === 1 ? (
          <form className="panel tex form" onSubmit={next} noValidate>
            <LinkXNudge />
            {limitNote}
            <div className="field"><div className="field-row"><span id="img-l">Image<span className="req">Required</span></span><span className="c">Square works best</span></div>
              <div className={`drop ${over ? "over" : ""} ${fieldErr.img ? "bad" : ""}`} {...drop}>
                <label className="pv" htmlFor="img" id="img-drop" tabIndex={0} aria-labelledby="img-l" aria-describedby="img-help"
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); document.getElementById("img")?.click(); } }}>
                  {img?.preview ? <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="9" cy="9" r="1.8" /><path d="m21 15-4.5-4.5L6 21" /></svg>}</label>
                <div className="drop-text">
                  <label className="btn btn-quiet btn-sm" htmlFor="img">{img ? "Change image" : "Choose image"}</label>
                  <input id="img" type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void pick(file); }} />
                  {img ? <span className="upl" aria-live="polite">{img.error ? <span className="err">{img.error}</span> : img.logo ? <span className="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>Uploaded to IPFS</span>
                    : <><span className="upl-bar" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(img.progress * 100)}><span style={{ width: `${Math.round(img.progress * 100)}%` }} /></span><span className="muted">Uploading {Math.round(img.progress * 100)}%</span></>}</span>
                    : <span className="faint" style={{ fontSize: 13 }}>or drop it on the square</span>}
                </div></div>
              {fieldErr.img && <p className="field-err" role="alert">{fieldErr.img}</p>}
              <p className="help" id="img-help">PNG, JPEG, GIF or WEBP. Eden crops it to a centred square and stores it on IPFS with your token.</p></div>
            <div className="two">
              <div className="field"><div className="field-row"><label htmlFor="nm">Name<span className="req">Required</span></label><span className="c">{f.name.length}/32</span></div>
                <input className="input" id="nm" maxLength={32} placeholder="Aether" value={f.name} onChange={set("name")} aria-invalid={!!fieldErr.nm} aria-describedby={fieldErr.nm ? "nm-err" : undefined} autoComplete="off" />
                {fieldErr.nm && <p className="field-err" id="nm-err">{fieldErr.nm}</p>}</div>
              <div className="field"><div className="field-row"><label htmlFor="tk">Ticker<span className="req">Required</span></label><span className="c">{f.ticker.length}/10</span></div>
                <div className="affix"><span aria-hidden="true">$</span><input className="input mono" id="tk" maxLength={10} placeholder="AETH" value={f.ticker} onChange={set("ticker")} aria-invalid={!!fieldErr.tk} aria-describedby={fieldErr.tk ? "tk-err" : undefined} autoComplete="off" spellCheck={false} /></div>
                {fieldErr.tk && <p className="field-err" id="tk-err">{fieldErr.tk}</p>}</div>
            </div>
            <div className="field"><div className="field-row"><label htmlFor="ds">Description <span className="faint">optional</span></label><span className="c">{f.description.length}/256</span></div><textarea className="input" id="ds" maxLength={256} placeholder="One or two lines about the token." value={f.description} onChange={set("description")} /></div>
            <div className="three">
              <div className="field"><label className="field-row" htmlFor="sx">X <span className="faint" style={{ fontWeight: 400 }}>optional</span></label><input className="input" id="sx" type="url" inputMode="url" placeholder="https://x.com/…" value={f.x} onChange={set("x")} /></div>
              <div className="field"><label className="field-row" htmlFor="st">Telegram <span className="faint" style={{ fontWeight: 400 }}>optional</span></label><input className="input" id="st" type="url" inputMode="url" placeholder="https://t.me/…" value={f.telegram} onChange={set("telegram")} /></div>
              <div className="field"><label className="field-row" htmlFor="sw">Website <span className="faint" style={{ fontWeight: 400 }}>optional</span></label><input className="input" id="sw" type="url" inputMode="url" placeholder="https://" value={f.website} onChange={set("website")} /></div>
            </div>
            <div className="formfoot"><span className="err" role="status">{err}</span><button className="btn btn-primary" type="submit" disabled={uploading}>{uploading ? "Uploading image…" : "Continue"}</button></div>
          </form>
        ) : (
          <form className="panel tex form" onSubmit={(e) => void launch(e)} noValidate>
            {limitNote}
            <div className="field"><span className="field-row" id="fee-l">Creator fee</span>
              <div className="chips" role="group" aria-labelledby="fee-l">{FEES.map((x) => <button key={x} className="chip" type="button" aria-pressed={x === fee} onClick={() => setFee(x)}>{x}%</button>)}</div>
              <p className="help">{fee > 0 ? `You earn ${fee}% of every trade, before and after graduation.` : "No creator fee: traders pay only the platform fee."}</p></div>
            <div className="field"><div className="field-row"><label htmlFor="ib">Initial buy <span className="faint">optional</span></label><span className="c">Balance {balance != null ? balance.toFixed(2) : "—"} HYPE</span></div>
              <div className="box-row" style={{ gap: 12, flexWrap: "wrap" }}><div className="affix" style={{ maxWidth: 180, flex: "1 1 140px" }}><input className="input mono" id="ib" inputMode="decimal" value={buy} onChange={(e) => setBuy(e.target.value.replace(/[^0-9.]/g, ""))} style={{ paddingLeft: 14, paddingRight: 56 }} aria-describedby="ib-help" /><span style={{ left: "auto", right: 14 }} aria-hidden="true">HYPE</span></div>
                <div className="chips" role="group" aria-label="Initial buy presets">{["None", "0.5", "1", "2", "5"].map((x) => <button key={x} className="chip" type="button" aria-pressed={x === "None" ? buyHype === 0 : buyHype === Number(x)} onClick={() => setBuy(x === "None" ? "0" : x)}>{x}</button>)}</div></div>
              <p className="help" id="ib-help">{buyHype > 0 ? `You'll own about ${(share * 100).toFixed(2)}% at launch, bought in the same transaction.` : "No initial buy. Anyone can buy first."}</p></div>
            <div className="box-row"><div><div style={{ fontWeight: 500 }} id="bb-l">Buyback</div><p className="help" id="bb-help">Part of your fee buys back and burns the token.</p></div>
              <button className="switch" type="button" role="switch" aria-checked={buyback} aria-labelledby="bb-l" aria-describedby="bb-help" onClick={() => setBuyback(!buyback)} /></div>
            <details open={bundle.length > 0 || undefined}><summary>Bundle wallets <span className="faint">{bundleList.length ? `${bundleList.length}/31` : "Advanced"}</span></summary>
              <div className="field" style={{ marginTop: 12 }}><textarea className="input mono" aria-label="Bundle wallets, one address per line" aria-invalid={badBundle.length > 0 || bundleList.length > 31} placeholder="One address per line, up to 31. These wallets skip the launch snipe tax." value={bundle} onChange={(e) => setBundle(e.target.value)} />
                {badBundle.length > 0 && <p className="field-err">Not an address: <span className="mono">{badBundle[0]}</span>. Addresses start with 0x and have 40 more characters.</p>}
                {bundleList.length > 31 && <p className="field-err">That's {bundleList.length} wallets. Up to 31.</p>}</div></details>
            <dl className="cost" aria-label="Cost">
              <div><dt>Launch fee</dt><dd>{hypeFmt(launchFee)} HYPE</dd></div>
              {buyHype > 0 && <div><dt>Initial buy</dt><dd>{hypeFmt(buyHype)} HYPE</dd></div>}
              <div className="total"><dt>Total</dt><dd>{hypeFmt(total)} HYPE <span className="faint">+ gas</span></dd></div>
            </dl>
            {short4Balance && <p className="field-err">Your wallet has {balance!.toFixed(2)} HYPE. Lower the initial buy or add HYPE.</p>}
            {err && <p className="err" role="alert" style={{ margin: 0 }}>{err}</p>}
            <div className="formfoot"><button className="btn btn-quiet" type="button" onClick={() => setStep(1)}>Back</button>
              <span className="help mono">{quota.data ? `${Math.min(usedToday, dailyLimit)} of ${dailyLimit} today · ${Math.min(used, limit)} of ${limit} this month` : ""}</span>
              <button className="btn btn-primary" type="submit" disabled={!!busy || full || !img?.logo || (!!w.address && short4Balance)}>{busy || (!w.address ? "Connect wallet to launch" : full ? `Launch again ${resets}` : `Launch $${f.ticker}`)}</button></div>
          </form>
        )}
        <aside className="panel tex board" aria-label="Preview"><span className="lbl">Preview</span>
          <div className="board-tok"><span className="tile" style={{ width: 56, height: 56, fontSize: 18, background: "var(--well)", color: "var(--accent)" }}>{img?.preview ? <img src={img.preview} alt="" /> : initials}</span>
            <div style={{ minWidth: 0 }}><div style={{ font: "600 18px var(--sans)", overflowWrap: "anywhere" }}>{f.name || "Your token"}</div><div className="mono muted">${f.ticker || "TICKER"} · HYPE pair</div>
              {w.address && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>by <span className="mono">{short(w.address)}</span></div>}</div></div>
          <p className="muted" style={{ margin: 0, overflowWrap: "anywhere" }}>{f.description || "A line or two about the token goes here."}</p>
          <dl><div><dt>Supply</dt><dd>1,000,000,000</dd></div><div><dt>Graduates at</dt><dd>{gradLabel} market cap</dd></div><div><dt>Creator fee</dt><dd>{fee}%</dd></div><div><dt>Launch fee</dt><dd>{hypeFmt(launchFee)} HYPE</dd></div></dl>
        </aside>
      </div>
    </div>
  );
}


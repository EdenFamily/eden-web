import { useEffect, useMemo, useState } from "react";
import { BaseError, ContractFunctionRevertedError, formatUnits, maxUint256, parseUnits, type Address, type Hex } from "viem";
import type { Token } from "../lib/api";
import { curveAbi, elysium, erc20Abi, publicClient, UNISWAP } from "../lib/chain";
import { quoteBuy, quoteSell, readCurve, type CurveState } from "../lib/curve";
import { amount, fromWei, hype } from "../lib/format";
import { PERMIT_AMOUNT, PERMIT_SECONDS, permit2Abi, permitTyped, poolId, poolKey, quotePool, readPool, SLIPPAGE_SELECTORS, swapCalldata, type Permit, type PoolState } from "../lib/pool";
import { minimumOut, setSlippage, SLIPPAGE_PRESETS, useSlippage } from "../lib/slippage";
import { send, sendData, signTypedData, useWallet } from "../lib/wallet";
import { I } from "./icons";
import { askToConnect } from "./Shell";
import { TokenImage, toast } from "./ui";

/** True when a revert means the price moved past the trader's slippage, so nothing was traded. */
function isSlippage(e: unknown): boolean {
  const text = e instanceof Error ? e.message : String(e);
  if (/slippage|TooLittleReceived|InsufficientOutput/i.test(text)) return true;
  const withData = e instanceof BaseError ? e.walk((x) => typeof (x as { data?: unknown }).data === "string" || x instanceof ContractFunctionRevertedError) : undefined;
  const data = (withData instanceof ContractFunctionRevertedError ? withData.raw : (withData as { data?: Hex } | null)?.data) ?? (text.match(/0x[0-9a-f]{8}/i)?.[0] as Hex | undefined);
  return !!data && SLIPPAGE_SELECTORS.some((s) => data.toLowerCase().startsWith(s));
}

function SlippageRow() {
  const pct = useSlippage();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const preset = (SLIPPAGE_PRESETS as readonly number[]).includes(pct);
  return (<>
    <div className="kv"><span>Slippage</span>
      <button className="slip-btn" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{pct}% <span aria-hidden="true">{open ? "▴" : "▾"}</span></button></div>
    {open && <div className="slip-edit" role="group" aria-label="Slippage tolerance">
      {SLIPPAGE_PRESETS.map((p) => <button key={p} className="chip" type="button" aria-pressed={pct === p} onClick={() => { setSlippage(p); setCustom(""); }}>{p}%</button>)}
      <label className="slip-custom"><input id="slip-custom" inputMode="decimal" placeholder={preset ? "Custom" : String(pct)} value={custom}
        onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); setCustom(v); if (Number(v) > 0) setSlippage(Number(v)); }} aria-label="Custom slippage in percent" />%</label>
    </div>}
  </>);
}

/** Buy and sell: on the bonding curve before graduation, on the token's Uniswap V4 pool after. */
export function TradePanel({ t }: { t: Token }) {
  const w = useWallet();
  const slip = useSlippage();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [input, setInput] = useState("0.5");
  const [curve, setCurve] = useState<CurveState>();
  const [pool, setPool] = useState<PoolState>();
  const [poolErr, setPoolErr] = useState("");
  const [held, setHeld] = useState<bigint>(0n);
  const [busy, setBusy] = useState("");
  const onCurve = t.phase === "curve";
  const key = useMemo(() => poolKey(t.address as Address), [t.address]);
  useEffect(() => {
    if (onCurve) { void readCurve(t.curve as Address).then(setCurve); return; }
    const id = poolId(key);
    if (t.pool_id && id.toLowerCase() !== t.pool_id.toLowerCase()) { setPoolErr("This token's pool isn't the Eden pool this site trades. Trade it on Uniswap instead."); return; }
    void readPool(id).then(setPool, () => setPoolErr("Couldn't read the pool. Try again in a moment."));
  }, [t.curve, t.real_quote_reserve, t.price_quote, onCurve, key, t.pool_id, busy]);
  useEffect(() => {
    if (!w.address) return setHeld(0n);
    void publicClient.readContract({ address: t.address as Address, abi: erc20Abi, functionName: "balanceOf", args: [w.address] }).then(setHeld);
  }, [w.address, t.address, busy]);
  const amountIn = useMemo(() => { try { return input ? parseUnits(input, 18) : 0n; } catch { return 0n; } }, [input]);
  const q = amountIn === 0n ? undefined
    : onCurve ? (curve ? (side === "buy" ? quoteBuy(curve, amountIn) : quoteSell(curve, amountIn)) : undefined)
    : pool ? quotePool(pool, side, amountIn) : undefined;
  const minOut = q ? minimumOut(q.out, slip) : 0n;
  const balance = side === "buy" ? w.balance ?? 0n : held;
  const tooMuch = amountIn > balance;

  async function poolTrade(me: Address, out: bigint) {
    const deadline = (await publicClient.getBlock()).timestamp + 120n;
    let permit: { permit: Permit; signature: Hex } | undefined;
    if (side === "sell") {
      const toPermit2 = await publicClient.readContract({ address: t.address as Address, abi: erc20Abi, functionName: "allowance", args: [me, UNISWAP.permit2] });
      if (toPermit2 < amountIn) { setBusy("Approve in your wallet (once per token)"); await send(t.address as Address, erc20Abi, "approve", [UNISWAP.permit2, maxUint256]); }
      const [allowed, expiration, nonce] = await publicClient.readContract({ address: UNISWAP.permit2, abi: permit2Abi, functionName: "allowance", args: [me, t.address as Address, UNISWAP.universalRouter] });
      if (allowed < amountIn || BigInt(expiration) < deadline + 300n) {
        const p: Permit = { details: { token: t.address as Address, amount: PERMIT_AMOUNT, expiration: Number(deadline) + PERMIT_SECONDS, nonce: Number(nonce) }, spender: UNISWAP.universalRouter, sigDeadline: deadline + 1800n };
        setBusy("Sign in your wallet (no gas)");
        permit = { permit: p, signature: await signTypedData(permitTyped(p, elysium.id)) };
      }
    }
    const data = swapCalldata(key, side, amountIn, minimumOut(out, slip), deadline, permit);
    const value = side === "buy" ? amountIn : 0n;
    setBusy("Confirm in your wallet"); // sendData simulates first: a slippage revert stops before the wallet opens
    await sendData(UNISWAP.universalRouter, data, value);
  }

  async function go() {
    if (!w.address) return askToConnect();
    if (!q) return;
    try {
      if (!onCurve) await poolTrade(w.address, q.out);
      else if (side === "buy") {
        setBusy("Confirm in your wallet");
        await send(t.curve as Address, curveAbi, "buy", [amountIn, minOut, w.address], amountIn);
      } else {
        const allowance = await publicClient.readContract({ address: t.address as Address, abi: erc20Abi, functionName: "allowance", args: [w.address, t.curve as Address] });
        if (allowance < amountIn) { setBusy("Approve in your wallet (once per token)"); await send(t.address as Address, erc20Abi, "approve", [t.curve, maxUint256]); }
        setBusy("Confirm in your wallet");
        await send(t.curve as Address, curveAbi, "sell", [amountIn, minOut, w.address]);
      }
      toast(side === "buy" ? `Bought ${amount(Number(formatUnits(q.out, 18)))} $${t.symbol}` : `Sold for ${hype(Number(formatUnits(q.out, 18)))}`);
      setInput("");
    } catch (e) {
      const m = (e as Error).message;
      toast(/rejected|denied/i.test(m) ? "Cancelled in your wallet." : isSlippage(e) ? `Price moved more than your ${slip}% slippage. Nothing was traded; try again or raise it.` : m.split("\n")[0]!, "err");
    } finally { setBusy(""); }
  }

  const presets = side === "buy" ? ["0.1", "0.5", "1", "5"] : ["25%", "50%", "75%", "Max"];
  const feeBps = onCurve ? t.curve_fee_bps : pool?.hookFeeBps ?? 100;
  const taxBps = onCurve ? t.creator_tax_bps : pool?.creatorTaxBps ?? t.creator_tax_bps;
  const hypeChip = <><i style={{ background: "var(--accent)", color: "var(--on-accent)" }}>H</i>HYPE</>;
  const tokenChip = <><TokenImage address={t.address} logo={t.logo} size={22} label={t.name} />{t.symbol}</>;
  return (
    <aside className="panel tex trade" aria-label="Trade">
      <div className="seg">{(["buy", "sell"] as const).map((s) => <button key={s} type="button" aria-pressed={side === s} onClick={() => { setSide(s); setInput(""); }}>{s === "buy" ? "Buy" : "Sell"}</button>)}</div>
      {poolErr ? <p className="note">{poolErr}</p> : (<>
        <div className="box">
          <div className="box-row"><span className="muted" style={{ fontSize: 13 }}>You pay</span><span className="muted mono" style={{ fontSize: 12 }}>Balance {side === "buy" ? hype(fromWei(w.balance ?? 0n)) : `${amount(fromWei(held))} ${t.symbol}`}</span></div>
          <div className="box-row"><input id="amt" className="amt" inputMode="decimal" placeholder="0" value={input} onChange={(e) => setInput(e.target.value.replace(/[^0-9.]/g, ""))} aria-label="Amount to pay" />
            <span className="asset">{side === "buy" ? hypeChip : tokenChip}</span></div>
          <div className="chips">{presets.map((p) => <button key={p} className="chip" type="button" onClick={() => setInput(p.endsWith("%") || p === "Max" ? formatUnits((held * BigInt(p === "Max" ? 100 : parseInt(p))) / 100n, 18) : p)}>{p}</button>)}</div>
        </div>
        <button className="flip" type="button" aria-label="Switch buy and sell" onClick={() => { setSide(side === "buy" ? "sell" : "buy"); setInput(""); }}>{I.flip()}</button>
        <div className="box"><span className="muted" style={{ fontSize: 13 }}>You get</span>
          <div className="box-row"><span className="amt mono">{q ? (side === "buy" ? amount(Number(formatUnits(q.out, 18))) : Number(formatUnits(q.out, 18)).toFixed(4)) : "—"}</span>
            <span className="asset">{side === "buy" ? tokenChip : hypeChip}</span></div></div>
        <div className="kv"><span>Price impact</span><b>{q ? (q.impactBps / 100).toFixed(2) + "%" : "—"}</b></div>
        <SlippageRow />
        <div className="kv"><span>Minimum received</span><b>{q ? (side === "buy" ? `${amount(Number(formatUnits(minOut, 18)))} ${t.symbol}` : hype(Number(formatUnits(minOut, 18)))) : "—"}</b></div>
        <div className="kv"><span>Fees</span><b>{feeBps / 100}% {onCurve ? "curve" : "pool"} + {taxBps / 100}% creator</b></div>
        <div className="kv"><span>Route</span><b>{onCurve ? "Bonding curve" : "Uniswap V4"}</b></div>
        {w.address && tooMuch && amountIn > 0n && <p className="err">That's more than your balance.</p>}
        <button className="btn btn-primary btn-block" type="button" style={{ height: 48 }} disabled={!!busy || (!!w.address && (!q || tooMuch))} onClick={() => void go()}>
          {busy || (!w.address ? "Sign in" : !q ? "Enter an amount" : side === "buy" ? `Buy ${hype(Number(input))}` : `Sell ${amount(Number(input))} ${t.symbol}`)}
        </button>
      </>)}
    </aside>
  );
}

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { imageFor } from "../lib/art";
import { I } from "./icons";

/* ---------- toast ---------- */
let message: { text: string; tone: "ok" | "err" } | null = null;
const subs = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string, tone: "ok" | "err" = "ok"): void {
  message = { text, tone };
  subs.forEach((s) => s());
  clearTimeout(timer);
  timer = setTimeout(dismiss, tone === "err" ? 8000 : 3000);
}
function dismiss(): void { clearTimeout(timer); message = null; subs.forEach((s) => s()); }
export function Toast() {
  const m = useSyncExternalStore((s) => (subs.add(s), () => void subs.delete(s)), () => message);
  if (!m) return null;
  // Errors interrupt (role=alert), stay longer, and can be closed; confirmations are polite and fade on their own.
  return (
    <div className={`toast ${m.tone}`} role={m.tone === "err" ? "alert" : "status"}>
      <i aria-hidden="true" /><span>{m.text}</span>
      {m.tone === "err" && <button className="toast-x" type="button" aria-label="Dismiss" onClick={dismiss}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>}
    </div>
  );
}

/* ---------- token image ---------- */
export function TokenImage({ address, logo, size, label }: { address: string; logo: string; size: number; label: string }) {
  const [src, setSrc] = useState(() => imageFor(address, logo, Math.min(192, size * 2), Math.min(192, size * 2)));
  return (
    <span className="tile" style={{ width: size, height: size }} role="img" aria-label={label}>
      <img src={src} alt="" onError={() => setSrc(imageFor(address, "", 192, 192))} />
    </span>
  );
}

/* ---------- copy button ---------- */
export function Copy({ value, label }: { value: string; label: string }) {
  return (
    <button className="iconbtn cp" type="button" aria-label={label} onClick={async (e) => {
      e.stopPropagation();
      try { await navigator.clipboard.writeText(value); toast("Copied"); } catch { toast("Copy is blocked here. Select the text instead.", "err"); }
    }}>{I.copy()}</button>
  );
}

/* ---------- full-panel states: not found, failed to load ---------- */
export function StateCard({ title, body, code, children, as = "h2" }: { title: string; body: ReactNode; code?: string; children?: ReactNode; as?: "h1" | "h2" }) {
  const H = as;
  return (
    <div className="panel tex state">
      {code && <span className="code">{code}</span>}
      <H>{title}</H>
      <p>{body}</p>
      {children && <div className="row">{children}</div>}
    </div>
  );
}

/* ---------- async data hook ---------- */
export function useData<T>(load: () => Promise<T>, deps: unknown[]): { data?: T; error?: string; loading: boolean; reload: () => void } {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    load().then((data) => alive && setState({ data, loading: false }), (e: Error) => alive && setState({ error: e.message, loading: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { ...state, reload: () => setN((x) => x + 1) };
}

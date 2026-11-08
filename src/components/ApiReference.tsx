import { useEffect, useState } from "react";

/**
 * The public API reference, built from the server's own /openapi.json when the page opens, so it can't drift from
 * what is deployed. One collapsible row per operation, grouped the way builders look for things.
 */
const API = import.meta.env.VITE_API_URL ?? "/api";
const PUBLIC_BASE = "https://edenfamily.xyz/api";

type Param = { name: string; in: string; required?: boolean; description?: string; schema?: { type?: string; enum?: string[]; default?: unknown; pattern?: string } };
type Op = { method: string; path: string; summary?: string; description?: string; tags?: string[]; parameters?: Param[]; body?: unknown; bodyFields?: [string, string, boolean][]; example?: unknown };
type Spec = { paths: Record<string, Record<string, { summary?: string; description?: string; tags?: string[]; parameters?: Param[]; requestBody?: { content?: Record<string, { example?: unknown; schema?: { properties?: Record<string, { description?: string; type?: string }>; required?: string[] } }> }; responses?: Record<string, { content?: Record<string, { example?: unknown }> }> }>> };

const GROUPS: [string, (o: Op) => boolean][] = [
  ["Tokens", (o) => o.path.startsWith("/tokens") && !/\/(quote|trades|candles)$/.test(o.path) || o.path.startsWith("/token/") || o.path.startsWith("/images/")],
  ["Quotes & transactions", (o) => o.path.endsWith("/quote") || o.path.startsWith("/tx/") || o.path === "/uploads/image"],
  ["Charts & trades", (o) => /\/(trades|candles)$/.test(o.path) && o.path.startsWith("/tokens")],
  ["Wallets", (o) => o.path.startsWith("/wallets")],
  ["Creators & referrals", (o) => o.path.startsWith("/creators") || o.path.startsWith("/referrals")],
  ["Live feed", (o) => o.path === "/ws"],
  ["Status", () => true],
];

function operations(spec: Spec): Op[] {
  const out: Op[] = [];
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, o] of Object.entries(methods)) {
      if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
      const json = o.requestBody?.content?.["application/json"];
      const props = json?.schema?.properties ?? {};
      const ok = o.responses?.["200"]?.content ?? o.responses?.["101"]?.content ?? {};
      const example = Object.values(ok).find((c) => c.example !== undefined)?.example;
      out.push({ method: method.toUpperCase(), path, summary: o.summary, description: o.description, tags: o.tags, parameters: o.parameters,
        body: json?.example, bodyFields: Object.entries(props).map(([k, v]) => [k, v.description ?? v.type ?? "", (json?.schema?.required ?? []).includes(k)]),
        example });
    }
  }
  return out;
}

/** A curl line with the operation's required parameters filled from the spec (enum, default) or a placeholder. */
function curl(o: Op): string {
  if (o.path === "/ws") return `wscat -c wss://edenfamily.xyz/ws`;
  const sample = (p: Param) => p.schema?.enum?.[0] ?? (p.schema?.default !== undefined ? String(p.schema.default) : /address/i.test(p.name) || p.schema?.pattern?.includes("40") ? "$TOKEN" : p.name === "amount" ? "1000000000000000000" : `<${p.name}>`);
  const path = o.path.replace(/\{(\w+)\}/g, (_, n: string) => { const p = o.parameters?.find((x) => x.name === n); return p ? sample(p) : `<${n}>`; });
  const q = (o.parameters ?? []).filter((p) => p.in === "query" && p.required).map((p) => `${p.name}=${sample(p)}`).join("&");
  const url = `${PUBLIC_BASE}${path}${q ? `?${q}` : ""}`;
  if (o.method === "GET") return `curl "${url}"`;
  if (o.path === "/uploads/image") return `curl -X POST "${url}" \\\n  -H "content-type: image/png" --data-binary @logo.png`;
  return `curl -X ${o.method} "${url}" \\\n  -H "content-type: application/json" \\\n  -d '${JSON.stringify(o.body ?? {})}'`;
}

function Row({ o }: { o: Op }) {
  const params = (o.parameters ?? []).filter((p) => p.in !== "header");
  return (
    <details className="api-op">
      <summary><span className={`api-m ${o.method.toLowerCase()}`}>{o.method}</span><span className="mono api-path">{o.path}</span><span className="api-sum">{o.summary}</span></summary>
      <div className="api-body">
        {o.description && <p>{o.description}</p>}
        {params.length > 0 && <table className="dtable api-params"><thead><tr><th>Parameter</th><th>In</th><th>Description</th></tr></thead>
          <tbody>{params.map((p) => <tr key={p.in + p.name}><td className="mono">{p.name}{p.required && <span className="api-req">required</span>}</td><td>{p.in}</td>
            <td>{p.description}{p.schema?.enum && <> One of <span className="mono">{p.schema.enum.join(", ")}</span>.</>}{p.schema?.default !== undefined && <> Default <span className="mono">{String(p.schema.default)}</span>.</>}</td></tr>)}</tbody></table>}
        {o.bodyFields && o.bodyFields.length > 0 && <table className="dtable api-params"><thead><tr><th>Body field</th><th colSpan={2}>Description</th></tr></thead>
          <tbody>{o.bodyFields.map(([k, d, req]) => <tr key={k}><td className="mono">{k}{req && <span className="api-req">required</span>}</td><td colSpan={2}>{d}</td></tr>)}</tbody></table>}
        <span className="lbl">Example request</span>
        <pre className="doc-code"><code>{curl(o)}</code></pre>
        {o.example !== undefined && <><span className="lbl">Example response</span>
          <pre className="doc-code api-example"><code>{typeof o.example === "string" ? o.example : JSON.stringify(o.example, null, 2)}</code></pre></>}
      </div>
    </details>
  );
}

export function ApiReference() {
  const [ops, setOps] = useState<Op[]>();
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch(`${API}/openapi.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))).then((s: Spec) => setOps(operations(s)), () => setErr("The API reference couldn't load. Reload the page, or read /api/openapi.json directly."));
  }, []);
  if (err) return <p className="err">{err}</p>;
  if (!ops) return <div className="api-skel"><span className="skel" /><span className="skel" /><span className="skel" /></div>;
  const left = [...ops];
  return (
    <div className="api-ref">
      {GROUPS.map(([name, match]) => {
        const mine = left.filter(match);
        mine.forEach((o) => left.splice(left.indexOf(o), 1));
        return mine.length ? <div key={name} className="api-group"><h3>{name}</h3>{mine.map((o) => <Row key={o.method + o.path} o={o} />)}</div> : null;
      })}
    </div>
  );
}

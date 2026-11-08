import { useEffect } from "react";
import { LEGAL_CONTACT, PRIVACY, TERMS, type LegalDoc } from "./legal-text";

/** Terms of Service (/terms) and Privacy Policy (/privacy): numbered sections with a contents list. */
export function Legal({ kind }: { kind: "terms" | "privacy" }) {
  const doc: LegalDoc = kind === "terms" ? TERMS : PRIVACY;
  useEffect(() => { document.title = `${doc.title} · Eden`; return () => { document.title = "Eden · Every token starts in Eden"; }; }, [doc]);
  return (
    <div className="wrap legal">
      <header className="legal-head">
        <span className="lbl">Eden Labs</span>
        <h1>{doc.title}</h1>
        <p className="muted">Last updated {doc.updated}</p>
        <p className="lede">{doc.intro}</p>
      </header>
      <nav className="legal-toc" aria-label="Contents">
        <ol>{doc.sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}</ol>
      </nav>
      <div className="legal-body">
        {doc.sections.map((s, i) => (
          <section key={s.id} id={s.id}>
            <h2><span className="mono">{String(i + 1).padStart(2, "0")}</span>{s.title}</h2>
            {s.body.map((p, j) => <p key={j}>{p}</p>)}
          </section>
        ))}
        <p className="legal-contact">Contact: <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a></p>
      </div>
    </div>
  );
}

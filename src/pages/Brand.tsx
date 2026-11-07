import { Copy } from "../components/ui";

const B = "/brand/";
type Asset = { file: string; label: string };

const SYMBOLS: Array<Asset & { ground: "dark" | "light" }> = [
  { file: "eden-mark.svg", label: "Full colour", ground: "dark" },
  { file: "eden-icon.svg", label: "Icon", ground: "dark" },
  { file: "eden-mark-flat.svg", label: "Flat", ground: "dark" },
  { file: "eden-mark-white.svg", label: "White", ground: "dark" },
  { file: "eden-mark-onlight.svg", label: "On light", ground: "light" },
  { file: "eden-mark-ink.svg", label: "Ink", ground: "light" },
];
const WORDMARKS: Array<Asset & { ground: "dark" | "light" | "check" }> = [
  { file: "wordmark-dark.png", label: "On dark", ground: "dark" },
  { file: "wordmark-light.png", label: "On light", ground: "light" },
  { file: "wordmark-transparent.png", label: "Transparent", ground: "check" },
];
const COLOURS = [
  { name: "Deep space", hex: "#04181C", note: "Grounds, the orb" },
  { name: "Eden teal", hex: "#061A1E", note: "Site background" },
  { name: "Mint", hex: "#97FCE4", note: "The bar, highlights" },
  { name: "Elysium teal", hex: "#5BB2CB", note: "End of the crescent" },
  { name: "First light", hex: "#FFD36B", note: "The dawn point, graduation" },
  { name: "Mist", hex: "#EAF1F3", note: "Text on dark" },
];
const SOCIAL: Array<Asset & { size: string }> = [
  { file: "x-banner-1500x500.png", label: "X banner", size: "1500 × 500" },
  { file: "x-avatar-400.png", label: "Profile picture", size: "400 × 400" },
  { file: "token-eden-512.png", label: "Token logo", size: "512 × 512" },
  { file: "app-icon-1024.png", label: "App icon", size: "1024 × 1024" },
];

function Download({ file, label }: Asset) {
  return <a className="btn btn-quiet btn-sm" href={B + file} download aria-label={`Download ${label} (${file.split(".").pop()?.toUpperCase()})`}>{file.split(".").pop()?.toUpperCase()}</a>;
}

export function Brand() {
  return (
    <div className="wrap">
      <div className="head"><div className="brand-head"><h1>Brand kit</h1><p className="muted">Eden's logo, colours and type, for writing about Eden, listing $EDEN or building on it.</p></div>
        <a className="btn btn-quiet" href={B + "eden-mark.svg"} download>Download the logo</a></div>

      <section className="panel brand-hero" aria-label="Logo">
        <div className="brand-lock"><img src={B + "eden-mark-word.svg"} alt="" /><b aria-hidden="true">DEN</b></div>
        <p>The Eden E: the round of a world, a bar of light across it, and a gold point where the first sunrise breaks.</p>
      </section>

      <section className="bk-sec" aria-labelledby="bk-symbol">
        <div className="sec-row"><h2 id="bk-symbol">Symbol</h2></div>
        <div className="bk-grid six">
          {SYMBOLS.map((s) => (
            <figure key={s.file} className="bk-tile">
              <div className={`bk-ground ${s.ground}`}><img src={B + s.file} alt={`Eden symbol, ${s.label.toLowerCase()}`} /></div>
              <figcaption><span>{s.label}</span><Download {...s} /></figcaption>
            </figure>
          ))}
        </div>
        <p className="help">Use full colour on dark screens and the icon wherever the mark sits alone in a circle or square (favicon, avatars, token lists). Use one colour only where colour is not possible.</p>
      </section>

      <section className="bk-sec" aria-labelledby="bk-word">
        <div className="sec-row"><h2 id="bk-word">Wordmark</h2></div>
        <div className="bk-grid three">
          {WORDMARKS.map((w) => (
            <figure key={w.file} className="bk-tile">
              <div className={`bk-ground wide ${w.ground}`}><img src={B + w.file} alt={`Eden wordmark, ${w.label.toLowerCase()}`} /></div>
              <figcaption><span>{w.label}</span><Download {...w} /></figcaption>
            </figure>
          ))}
        </div>
        <p className="help">The symbol is the E, so the wordmark reads EDEN. In running text, write Eden.</p>
      </section>

      <section className="bk-sec" aria-labelledby="bk-social">
        <div className="sec-row"><h2 id="bk-social">Social and token</h2></div>
        <figure className="bk-tile">
          <div className="bk-ground banner"><img src={B + SOCIAL[0]!.file} alt="Eden X banner: the wordmark over a planet at first sunrise" /></div>
          <figcaption><span>{SOCIAL[0]!.label} <span className="faint mono">{SOCIAL[0]!.size}</span></span><Download {...SOCIAL[0]!} /></figcaption>
        </figure>
        <div className="bk-grid three">
          {SOCIAL.slice(1).map((s) => (
            <figure key={s.file} className="bk-tile">
              <div className="bk-ground dark"><img className={s.file.startsWith("x-") || s.file.startsWith("token") ? "round" : "rounded"} src={B + s.file} alt={`Eden ${s.label.toLowerCase()}`} /></div>
              <figcaption><span>{s.label} <span className="faint mono">{s.size}</span></span><Download {...s} /></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="bk-sec" aria-labelledby="bk-colour">
        <div className="sec-row"><h2 id="bk-colour">Colour</h2></div>
        <div className="bk-grid six">
          {COLOURS.map((c) => (
            <div key={c.hex} className="panel bk-swatch">
              <div className="chip-c" style={{ background: c.hex }} />
              <div className="bk-sw-row"><div><div className="nm">{c.name}</div><div className="mono muted">{c.hex}</div></div><Copy value={c.hex} label={`Copy ${c.name} ${c.hex}`} /></div>
              <div className="faint" style={{ fontSize: 12 }}>{c.note}</div>
            </div>
          ))}
        </div>
        <div className="panel bk-gradient"><span className="lbl">Light gradient</span><div className="bar" /><span className="mono muted">#FFD36B → #97FCE4 → #5BB2CB</span></div>
      </section>

      <section className="bk-sec" aria-labelledby="bk-type">
        <div className="sec-row"><h2 id="bk-type">Type</h2></div>
        <div className="bk-grid three">
          <div className="panel bk-type"><span className="lbl">Wordmark · Michroma</span><span className="t-mark">EDEN</span></div>
          <div className="panel bk-type"><span className="lbl">Text · Geist</span><span className="t-sans">Every token starts in Eden.</span></div>
          <div className="panel bk-type"><span className="lbl">Numbers · Geist Mono</span><span className="t-mono">$72,140 · 187.5 HYPE</span></div>
        </div>
      </section>

      <section className="bk-sec" aria-labelledby="bk-use">
        <div className="sec-row"><h2 id="bk-use">Using the logo</h2></div>
        <div className="bk-grid two">
          <div className="panel bk-rules"><span className="lbl">Do</span><ul>
            <li>Leave clear space around the symbol of at least half its width.</li>
            <li>Place full colour on deep teal or black; use the on-light or ink version on light grounds.</li>
            <li>Keep the gold dawn point at the top right.</li></ul></div>
          <div className="panel bk-rules"><span className="lbl">Don't</span><ul>
            <li>Recolour the gradient, stretch, rotate or outline the symbol.</li>
            <li>Add glows, shadows or effects to the flat or one-colour versions.</li>
            <li>Use the logo to suggest that Eden endorses a token.</li></ul></div>
        </div>
      </section>
    </div>
  );
}

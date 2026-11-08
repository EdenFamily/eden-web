import { Fragment, useEffect, useState } from "react";
import { elysium } from "../lib/chain";
import { CONTRACT_ROWS, DEPLOYMENT_JSON_URL, GRADUATION_HYPE, PHANTOM_HYPE, SOURCE_URL, SUPPLY_SPLIT } from "../lib/deployment";
import { DEV_SECTIONS, DocsDevelopers } from "./DocsDevelopers";
import { Link } from "../components/router";

const pct = (v: number) => (v * 100).toFixed(1) + "%";

const SECTIONS = [
  ["overview", "What is Eden"],
  ["launch", "How a launch works"],
  ["graduation", "Graduation"],
  ["fees", "Fees"],
  ["protection", "Launch protection"],
  ["create", "Creating a token"],
  ["identity", "Creator identity"],
  ["x-launch", "Launch from X"],
  ["referrals", "Referrals"],
  ["perps", "Perps"],
  ["network", "Network and contracts"],
  ["risks", "Risks"],
  ...DEV_SECTIONS,
] as const;

/** Market cap (in HYPE) against HYPE raised on a fresh curve: 76.05 HYPE virtual reserve, graduation at 190.12 HYPE. */
function CurveFigure() {
  const W = 640, H = 220, pl = 52, pb = 30, pt = 14, pr = 120, phantom = PHANTOM_HYPE, grad = GRADUATION_HYPE;
  const mcap = (raised: number) => (phantom + raised) ** 2 / phantom;
  const maxY = mcap(grad) * 1.08;
  const x = (r: number) => pl + (r / grad) * (W - pl - pr), y = (m: number) => pt + (1 - m / maxY) * (H - pt - pb);
  const pts = Array.from({ length: 61 }, (_, i) => (i / 60) * grad).map((r) => `${x(r)},${y(mcap(r))}`).join(" ");
  return (
    <figure className="panel tex curve-fig" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Market cap rises from 76 to about 932 HYPE as 190.1 HYPE is raised">
        {[0, 250, 500, 750].map((m) => <g key={m}><line x1={pl} x2={x(grad)} y1={y(m)} y2={y(m)} stroke="var(--rule)" /><text x={pl - 8} y={y(m) + 4} textAnchor="end" fill="var(--faint)" fontSize="11" fontFamily="var(--mono)">{m}</text></g>)}
        {[0, 50, 100, 150, 190.1].map((r) => <text key={r} x={x(r)} y={H - 10} textAnchor="middle" fill="var(--faint)" fontSize="11" fontFamily="var(--mono)">{r}</text>)}
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" />
        <line x1={x(grad)} x2={x(grad)} y1={pt} y2={H - pb} stroke="var(--gold)" strokeDasharray="4 4" />
        <circle cx={x(grad)} cy={y(mcap(grad))} r="4" fill="var(--gold)" />
        <text x={x(grad) + 10} y={y(mcap(grad)) + 4} fill="var(--gold)" fontSize="11" fontFamily="var(--mono)">graduates</text><text x={x(grad) + 10} y={y(mcap(grad)) + 18} fill="var(--gold)" fontSize="11" fontFamily="var(--mono)">≈932 HYPE</text>
        <circle cx={x(0)} cy={y(mcap(0))} r="4" fill="var(--accent)" />
        <text x={x(0) + 10} y={y(mcap(0)) + 18} fill="var(--muted)" fontSize="11" fontFamily="var(--mono)">starts at 76 HYPE</text>
      </svg>
      <figcaption className="note" style={{ marginTop: 8 }}>Market cap in HYPE (vertical) against HYPE raised on the curve (horizontal).</figcaption>
    </figure>
  );
}

export function Docs() {
  const [active, setActive] = useState<string>("overview");
  useEffect(() => {
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      const v = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (v) setActive(v.target.id);
    }, { rootMargin: "-80px 0px -60% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  // phones: the contents strip scrolls sideways, so keep the current section's link in view
  useEffect(() => { document.getElementById(`toc-${active}`)?.scrollIntoView({ block: "nearest", inline: "nearest" }); }, [active]);
  // opened as /docs#section (links from the footer, the Launch from X card): jump there once rendered
  useEffect(() => {
    const id = location.hash.slice(1);
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, []);
  const go = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); history.replaceState(null, "", `#${id}`); };
  return (
    <div className="wrap">
      <div className="head"><h1>Docs</h1></div>
      <div className="docs-grid">
        <nav className="toc" aria-label="On this page"><span className="toc-group">Guide</span>{SECTIONS.map(([id, label]) => <Fragment key={id}>
          {id === DEV_SECTIONS[0]?.[0] && <span className="toc-group">Developers</span>}
          <a href={`#${id}`} id={`toc-${id}`} aria-current={active === id ? "location" : undefined} onClick={go(id)}>{label}{id === "perps" ? <span className="soon">Soon</span> : null}</a></Fragment>)}</nav>
        <article className="doc">
          <section id="overview">
            <h2>What is Eden</h2>
            <p className="lede">Eden is a launchpad for new tokens on Elysium, the HYPE network built for Hyperliquid. Anyone can launch a token in one transaction, and everyone can trade it from the first second.</p>
            <div className="facts">
              <div className="panel tex fact"><span className="lbl">Supply</span><span className="v">1B</span></div>
              <div className="panel tex fact"><span className="lbl">Paired with</span><span className="v">HYPE</span></div>
              <div className="panel tex fact"><span className="lbl">Graduates at</span><span className="v">≈$72K</span></div>
              <div className="panel tex fact"><span className="lbl">Launch fee</span><span className="v">0.0005 HYPE</span></div>
            </div>
            <p>Eden is a non-custodial interface. Your wallet signs every transaction, Eden never holds your funds, and every token is created by its creator, not by Eden.</p>
          </section>

          <section id="launch">
            <h2>How a launch works</h2>
            <p>Every token starts on its own <b>bonding curve</b>: a contract that sells and buys the token at a price set by a formula, so there is always a price and always liquidity. Each buy raises the price; each sell lowers it.</p>
            <CurveFigure />
            <p>The curve starts with a virtual reserve of {PHANTOM_HYPE.toFixed(2)} HYPE against the full supply, so the first buyers pay the lowest price. When {GRADUATION_HYPE.toFixed(2)} HYPE has been raised, {pct(SUPPLY_SPLIT.sold)} of the supply has been sold and the token graduates.</p>
          </section>

          <section id="graduation">
            <h2>Graduation</h2>
            <p>At graduation the curve closes. Its {GRADUATION_HYPE.toFixed(2)} HYPE and {pct(SUPPLY_SPLIT.pool)} of the supply seed a <b>Uniswap V4 pool</b> at the curve's final price, so there is no jump. The remaining {pct(SUPPLY_SPLIT.locked)} of the supply can't be paired at that price and is locked with the liquidity.</p>
            <p>The pool's liquidity and the {pct(SUPPLY_SPLIT.locked)} are <b>locked forever</b>: nobody, including the creator and Eden, can remove them.</p>
            <p>You keep trading a graduated token on its Eden page, in the same buy and sell panel: Eden routes the trade through Uniswap's Universal Router. Buying needs no approval. Your first sell of a token asks for one approval and one signature (no gas); after that, every sell is a single transaction.</p>
            <div className="panel tex tscroll">
              <table className="dtable">
                <thead><tr><th>Supply at graduation</th><th>Share</th></tr></thead>
                <tbody>
                  <tr><td>Sold on the curve</td><td className="mono">{pct(SUPPLY_SPLIT.sold)}</td></tr>
                  <tr><td>Seeded into the Uniswap V4 pool</td><td className="mono">{pct(SUPPLY_SPLIT.pool)}</td></tr>
                  <tr><td>Locked forever</td><td className="mono">{pct(SUPPLY_SPLIT.locked)}</td></tr>
                </tbody>
              </table>
            </div>
            <p>Graduation lands at a market cap of about 932 HYPE, about $72K at today's HYPE price. Eden may retune the curve for new launches as HYPE's price moves; tokens already trading keep the curve they launched with.</p>
          </section>

          <section id="fees">
            <h2>Fees</h2>
            <div className="panel tex tscroll">
              <table className="dtable">
                <thead><tr><th>Fee</th><th>Size</th><th>Goes to</th></tr></thead>
                <tbody>
                  <tr><td>Trading fee on the curve</td><td className="mono">1%</td><td>70% the creator, 30% Eden</td></tr>
                  <tr><td>Trading fee in the pool, after graduation</td><td className="mono">1%</td><td>70% the creator, 30% Eden</td></tr>
                  <tr><td>Creator fee</td><td className="mono">0–10%</td><td>100% the creator, set at launch, on every trade for the token's life</td></tr>
                  <tr><td>Launch fee</td><td className="mono">0.0005 HYPE</td><td>Eden</td></tr>
                </tbody>
              </table>
            </div>
            <p>With <b>buyback</b> turned on, half of the creator's share of the trading fee buys the token back and takes it out of circulation. Creators claim their fees in HYPE from <b>Portfolio</b> at any time.</p>
          </section>

          <section id="protection">
            <h2>Launch protection</h2>
            <p>Bots that buy right after launch pay a <b>snipe tax</b>: 99% at the moment of launch, falling to zero over 15 seconds. The creator's initial buy and up to 31 bundle wallets the creator lists are exempt, so a team can buy at launch without being sniped.</p>
            <p>Every swap is checked against a minimum you set through slippage (3% by default, adjustable in the trade panel). Eden test-runs each trade before your wallet opens, so if the price has already moved past your slippage, nothing is sent and you pay nothing. If it moves while your trade is landing, the trade does not happen and you only pay gas.</p>
          </section>

          <section id="create">
            <h2>Creating a token</h2>
            <ol>
              <li><b>Identity.</b> Name (up to 32 characters), ticker (up to 10), description, image and links. These cannot be changed after launch.</li>
              <li><b>Economics.</b> Choose your creator fee, an optional initial buy and whether buyback is on.</li>
              <li><b>Launch.</b> One transaction creates the token and, if you chose one, makes your initial buy in the same block, before anyone else can trade.</li>
            </ol>
            <p>Each creator can launch up to <b>5 tokens a month</b>.</p>
          </section>

          <section id="identity">
            <h2>Creator identity</h2>
            <p>Link your <b>X</b> and/or <b>TikTok</b> account from the wallet menu. Your handle then shows as the creator on your tokens, with the platform's logo, instead of your wallet address. You link by logging in to that account, so nobody can claim a handle that isn't theirs.</p>
            <p>Each X or TikTok account can be linked to <b>one Eden wallet, once</b>. Links are permanent.</p>
          </section>

          <section id="x-launch">
            <h2>Launch from X <span className="soon">Soon</span></h2>
            <p>Launch a token without opening Eden: post on X and tag <b>@EdenOnElysium</b> with a ticker and a name, and attach an image. First link your X account to your Eden wallet from the wallet menu; launches from X accounts that aren't linked are not made.</p>
            <div className="panel tex doc-example"><span className="mono">@EdenOnElysium $FROG Frog</span></div>
            <ul>
              <li><b>Ticker</b> is the word after <span className="mono">$</span> (1–10 letters or digits); <b>name</b> is the rest of the text (up to 32 characters). The attached image becomes the token's logo; a post without an image doesn't launch.</li>
              <li>Reply to any post with the same text to turn that post into a token. Its image is used, and <b>you</b> are the token's creator, not the person who wrote the post. A token made from someone's post is not endorsed by them.</li>
              <li>Eden launches the token and replies to you with its contract address. Replies carry no links, so always check the contract address on Eden before you trade.</li>
              <li><b>Creator fees go to your linked Eden wallet</b> from the first trade: 70% of the trading fee, the same as launching on the site.</li>
              <li>Launching from X costs you nothing; Eden pays the launch.</li>
              <li><b>Who can launch:</b> verified X accounts at least 30 days old, linked to an Eden wallet. Your 5 launches a month are shared between X and the site. One launch per post, and a ticker can't be launched again within 24 hours.</li>
            </ul>
          </section>

          <section id="referrals">
            <h2>Referrals</h2>
            <p>Create your link on <b>Referrals</b>. Wallets that join through it are yours: you earn <b>25% of Eden's fee</b> on every trade they make after joining. Earnings are paid in HYPE once a day, once you've earned at least 0.01 HYPE.</p>
          </section>

          <section id="perps">
            <h2>Perps <span className="soon">Soon</span></h2>
            <p>Tokens that keep trading after graduation are headed for perpetual markets.</p>
            <p><b>Every trade funds its own perps listing.</b> Part of Eden's fee on each token is saved in a perps fund, tracked per token. When the fund covers the listing cost, it goes toward listing that token with our perps partner.</p>
            <ul>
              <li><b>On-chain:</b> each fund is calculated from on-chain fee events, so anyone can verify it.</li>
              <li><b>Earned:</b> only graduated tokens with real volume qualify.</li>
              <li><b>Fair pricing:</b> markets are priced from the token's locked pool, with isolated margin and open-interest caps.</li>
            </ul>
            <p>Details are published before launch.</p>
          </section>

          <section id="network">
            <h2>Network and contracts</h2>
            <div className="panel tex tscroll">
              <table className="dtable">
                <tbody>
                  <tr><td>Network</td><td>Elysium</td></tr>
                  <tr><td>Chain ID</td><td className="mono">{elysium.id}</td></tr>
                  <tr><td>Gas token</td><td>HYPE</td></tr>
                  {CONTRACT_ROWS.map(([name, address]) => <tr key={address}><td>{name}</td><td className="mono addr">{address}</td></tr>)}
                  <tr><td>Source code</td><td><a href={SOURCE_URL} target="_blank" rel="noreferrer">github.com/EdenFamily/eden-contracts</a></td></tr>
                  <tr><td>Deployment record</td><td><a href={DEPLOYMENT_JSON_URL} target="_blank" rel="noreferrer">elysium-mainnet.json</a></td></tr>
                  <tr><td>ABIs</td><td><a href="#abis">Download</a></td></tr>
                </tbody>
              </table>
            </div>
            <p>Eden adds Elysium to your wallet automatically when you sign in. To add it yourself, use chain ID {elysium.id} and HYPE as the currency.</p>
            <p>Logos, colours and the token logo are in the <Link to="/brand">brand kit</Link>.</p>
          </section>

          <section id="risks">
            <h2>Risks</h2>
            <ul>
              <li>New tokens are highly volatile and most lose most of their value. Only trade what you can afford to lose.</li>
              <li>Anyone can launch a token with any name. A linked X or TikTok handle shows who launched it; it is not an endorsement.</li>
              <li>Smart contracts can contain bugs. Eden's contracts are based on Pons V2 and have not had a separate audit.</li>
              <li>Nothing on Eden is financial advice.</li>
            </ul>
          </section>

          <DocsDevelopers />
        </article>
      </div>
    </div>
  );
}

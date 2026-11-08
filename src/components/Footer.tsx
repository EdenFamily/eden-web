import { Link } from "./router";

const SUPPORT = "support@eden.family";
const EXPLORER = "https://elysium.kinetiq.xyz/explorer";
const X_URL = String(import.meta.env.VITE_X_URL ?? "").trim();
const GITHUB_URL = String(import.meta.env.VITE_GITHUB_URL ?? "").trim();

/** "Built on Elysium" with Elysium's own logo: on the waiting page only. */
export function BuiltOnElysium() {
  return (
    <a className="built-on" href="https://elysium.kinetiq.xyz" target="_blank" rel="noreferrer" aria-label="Built on Elysium">
      <span>Built on</span><img src="/partners/elysium-light.svg" alt="" height={18} />
    </a>
  );
}

const ext = (href: string, label: string) => <a href={href} target="_blank" rel="noreferrer">{label} <span aria-hidden="true">↗</span></a>;

/** The site footer (Pons layout): Launchpad, Resources and Legal columns, copyright, the disclaimer. Before launch the
 * Launchpad column is left out (those pages open at launch). X and GitHub show once their URLs are set. */
export function SiteFooter({ prelaunch = false }: { prelaunch?: boolean }) {
  return (
    <div className="site-foot">
      <div className="foot-cols">
        {!prelaunch && <div className="foot-col"><h4>Launchpad</h4>
          <Link to="/create">Create a token</Link><Link to="/">Explore</Link><Link to="/portfolio">Portfolio</Link><Link to="/referrals">Referrals</Link></div>}
        <div className="foot-col"><h4>Resources</h4>
          <Link to="/docs">Docs</Link><Link to="/builders">Builders</Link><a href={`mailto:${SUPPORT}`}>Support</a>
          {ext(EXPLORER, "Explorer")}<Link to="/brand">Brand kit</Link>
          {X_URL && ext(X_URL, "Updates on X")}{GITHUB_URL && ext(GITHUB_URL, "GitHub")}</div>
        <div className="foot-col"><h4>Legal</h4>
          <Link to="/terms">Terms of Service</Link><Link to="/privacy">Privacy Policy</Link></div>
      </div>
      <div className="foot-copy">© 2026 Eden Labs. All rights reserved.</div>
      <p className="foot-note">Eden is a noncustodial software interface operated by Eden Labs. Eden does not hold your assets or keys,
        does not execute or reverse transactions, and is not a bank, broker, exchange, custodian, or investment adviser. Nothing on
        this site is financial, legal, or tax advice. Tokens are issued by their creators, not by Eden. They are highly volatile, may
        lose all value, and may have no liquidity. Listing or ranking a token is not an endorsement. You are responsible for your
        decisions, your wallet, and compliance with local law. Not available in restricted regions. Eden is not affiliated with
        Kinetiq. Support: <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a>.</p>
    </div>
  );
}

/** The waiting page's footer: one slim line and the Built on Elysium badge. */
export function SlimFooter() {
  return (
    <div className="slim-row">
      <nav className="slim-foot" aria-label="Footer">
        <span>© 2026 Eden Labs</span><Link to="/docs">Docs</Link><Link to="/builders">Builders</Link><Link to="/terms">Terms of Service</Link><Link to="/privacy">Privacy</Link>
        <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a>
      </nav>
      <BuiltOnElysium />
    </div>
  );
}

import { Link } from "../components/router";
import { SlimFooter } from "../components/Footer";
import { XIntro } from "../components/XIntro";

/** Before launch: the full-screen waiting page at "/". Docs, brand kit and the legal pages stay reachable. */
export function Waiting() {
  return (
    <div className="waiting">
      <main className="waiting-main">
        <img className="waiting-logo" src="/brand/eden-wordmark.svg?v=w1" alt="Eden" />
        <h1>Every token starts in Eden.</h1>
        <p>The first launchpad that takes memes from launch to perpetuals. Built on Uniswap, live on Elysium.</p>
        <span className="waiting-date"><i aria-hidden="true" />Opening November 9</span>
        <Link className="btn btn-quiet waiting-docs" to="/docs">Read the docs</Link>
      </main>
      <footer className="waiting-foot"><SlimFooter /></footer>
      <XIntro prelaunch />
    </div>
  );
}

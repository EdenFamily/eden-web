import { ABIS, DEPLOYMENT_JSON_URL, MAINNET, SOURCE_URL } from "../lib/deployment";
import { ApiReference } from "../components/ApiReference";

/** The developer half of the docs: source, ABIs and short viem examples against the mainnet contracts. */
export const DEV_SECTIONS = [
  ["developers", "Build on Eden"],
  ["api", "API"],
  ["dev-launch", "Launching a token"],
  ["dev-trade", "Buying and selling"],
  ["dev-read", "Reading a launch"],
  ["dev-fees", "Claiming fees"],
  ["dev-events", "Events to index"],
  ["abis", "ABIs"],
] as const;

function Code({ children }: { children: string }) {
  return <pre className="doc-code"><code>{children.trim()}</code></pre>;
}

export function DocsDevelopers() {
  return (
    <>
      <section id="developers">
        <h2>Build on Eden</h2>
        <p>Eden's contracts are open source and live on Elysium mainnet. Everything the app does, you can do from your own code: launch, trade, read a launch and claim fees.</p>
        <ul>
          <li><b>Source code:</b> <a href={SOURCE_URL} target="_blank" rel="noreferrer">github.com/EdenFamily/eden-contracts</a></li>
          <li><b>Deployment record:</b> <a href={DEPLOYMENT_JSON_URL} target="_blank" rel="noreferrer">elysium-mainnet.json</a> (every address and the start block)</li>
          <li><b>ABIs:</b> full JSON for every contract, <a href="#abis">below</a></li>
        </ul>
        <p>The examples use <a href="https://viem.sh" target="_blank" rel="noreferrer">viem</a>. Amounts are in wei; HYPE and every Eden token have 18 decimals.</p>
      </section>

      <section id="api">
        <h2>API</h2>
        <p>One public API for the website, bots and agents, with no keys: <span className="mono">https://edenfamily.xyz/api</span>. Amounts are decimal strings in wei; errors are <span className="mono">{"{ error, message }"}</span>. The full spec is <a href="/api/openapi.json" target="_blank" rel="noreferrer">openapi.json</a>.</p>
        <h3>Trading through the API</h3>
        <ol>
          <li><b>Quote.</b> <span className="mono">GET /tokens/:address/quote?side=buy&amp;amount=…&amp;slippageBps=300</span> returns the expected output and the minimum.</li>
          <li><b>Build.</b> <span className="mono">POST /tx/swap</span> returns the unsigned transactions to sign in order (an approval first, when a sell needs one).</li>
          <li><b>Verify each one before signing.</b> <span className="mono">chainId</span> is 99901, <span className="mono">to</span> is an Eden contract (or the token or its curve), the calldata decodes with the ABIs below, and its minimum out equals the quote's.</li>
          <li><b>Sign locally.</b> Your key never leaves your machine.</li>
          <li><b>Send.</b> Broadcast it yourself, or <span className="mono">POST /tx/send</span> with the signed transaction; then read the receipt.</li>
        </ol>
        <ApiReference />
      </section>

      <section id="dev-launch">
        <h2>Launching a token</h2>
        <p>Call <span className="mono">launchToken</span> on the factory with the launch fee as value. Launch config <span className="mono">0</span> and <span className="mono">pairToken = 0x0</span> launch against HYPE. The salt picks the token's address; any unused value works.</p>
        <Code>{`
const factoryAbi = parseAbi([
  "function launchFee() view returns (uint256)",
  "function launchToken((string name, string symbol, string logo, string description, (string twitter, string telegram, string discord, string website, string farcaster) socials, address creatorFeeRecipient, uint16 creatorTaxBps, bool buybackEnabled, bytes32 expectedEconomics, bytes32 salt) params, uint256 launchConfigId, address pairToken) payable returns (address token, address curve)",
  "event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)",
]);
const factory = "${MAINNET.factory}";
const fee = await client.readContract({ address: factory, abi: factoryAbi, functionName: "launchFee" });
await wallet.writeContract({
  address: factory, abi: factoryAbi, functionName: "launchToken", value: fee,
  args: [{ name: "Frog", symbol: "FROG", logo: "ipfs://…", description: "", socials: { twitter: "", telegram: "", discord: "", website: "", farcaster: "" },
           creatorFeeRecipient: me, creatorTaxBps: 0, buybackEnabled: false, expectedEconomics: zeroHash, salt: keccak256(toHex(Date.now())) },
         0n, zeroAddress],
});`}</Code>
        <p>To launch and make the first buy in the same transaction, use <span className="mono">launchAndBuy</span> on <span className="mono addr">{MAINNET.launchAndBuy}</span>.</p>
      </section>

      <section id="dev-trade">
        <h2>Buying and selling</h2>
        <p>Before graduation, trade directly against the token's curve (the <span className="mono">curve</span> address from <span className="mono">TokenLaunched</span>). Buys send HYPE as value. Sells need an ERC-20 approval of the curve first. Always pass a minimum out.</p>
        <Code>{`
const curveAbi = parseAbi([
  "function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) payable returns (uint256 tokensOut)",
  "function sell(uint256 tokensIn, uint256 minQuoteOut, address recipient) returns (uint256 quoteOut)",
]);
await wallet.writeContract({ address: curve, abi: curveAbi, functionName: "buy", args: [parseEther("1"), minTokensOut, me], value: parseEther("1") });
await wallet.writeContract({ address: curve, abi: curveAbi, functionName: "sell", args: [tokensIn, minQuoteOut, me] });`}</Code>
        <p>After graduation, the token trades in its Uniswap V4 pool (fee 0, tick spacing 200, hook <span className="mono addr">{MAINNET.memeHook}</span>) through any V4 router.</p>
      </section>

      <section id="dev-read">
        <h2>Reading a launch</h2>
        <Code>{`
const curveViews = parseAbi([
  "function getReserves() view returns (uint256 quoteReserve, uint256 tokenReserve)",
  "function realQuoteReserve() view returns (uint256)",
  "function graduationThreshold() view returns (uint256)",
  "function readyToGraduate() view returns (bool)",
  "function graduated() view returns (bool)",
  "function currentSnipeTaxBps(address recipient) view returns (uint256)",
]);
// Price in HYPE per token: quoteReserve / tokenReserve. Progress to graduation: realQuoteReserve / graduationThreshold.`}</Code>
      </section>

      <section id="dev-fees">
        <h2>Claiming fees</h2>
        <p>Creator fees collect in the fee escrow. Anyone can read a balance; each recipient claims their own.</p>
        <Code>{`
const escrowAbi = parseAbi([
  "function balanceOf(address recipient) view returns (uint256)",
  "function claim() returns (uint256 amount)",
]);
const escrow = "${MAINNET.feeEscrow}";
await wallet.writeContract({ address: escrow, abi: escrowAbi, functionName: "claim" });`}</Code>
      </section>

      <section id="dev-events">
        <h2>Events to index</h2>
        <ul>
          <li><b>Factory</b> <span className="mono">TokenLaunched</span>: a new token and its curve.</li>
          <li><b>Curve</b> <span className="mono">CurveBuy</span>, <span className="mono">CurveSell</span>: every trade before graduation, with fee and tax. <span className="mono">CurveCompleted</span>: the curve sold out.</li>
          <li><b>Factory</b> <span className="mono">PoolGraduated</span>: the token moved to its Uniswap V4 pool.</li>
          <li><b>Fee escrow</b> <span className="mono">Credited</span>, <span className="mono">Claimed</span>: fees earned and withdrawn.</li>
        </ul>
      </section>

      <section id="abis">
        <h2>ABIs</h2>
        <div className="panel tex tscroll">
          <table className="dtable">
            <thead><tr><th>Contract</th><th>Address</th><th>ABI</th></tr></thead>
            <tbody>
              {ABIS.map((a) => (
                <tr key={a.file}>
                  <td>{a.name}</td>
                  <td className="mono addr">{a.address ?? "One per launch"}</td>
                  <td><a className="mono" href={`/abi/${a.file}`} download>{a.file}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

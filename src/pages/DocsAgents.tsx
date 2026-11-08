import { Copy } from "../components/ui";

/** The agents part of the docs: install an Eden skill in any Agent Skills client, set its limits, and the SDKs. */
export const AGENT_SECTIONS = [
  ["agents", "AI agents"],
  ["agents-skills", "Install a skill"],
  ["agents-sdks", "SDKs"],
] as const;

const RAW = "https://raw.githubusercontent.com/EdenFamily/eden-skills/refs/heads/main";
const SKILLS: [string, string, string][] = [
  ["Create Token", "create-token", "Launch a token with an image and an optional first buy"],
  ["Swap", "swap", "Buy and sell, on the curve or the Uniswap pool"],
  ["Creator Fees", "creator-fees", "Check and claim creator fees"],
  ["Market Data", "market-data", "Top tokens, prices, charts, holders"],
];
const PROMPTS = [
  "Launch $PEPE Pepe on Eden with this image and a 0.5 HYPE first buy",
  "Buy 1 HYPE of <token> on Eden",
  "Sell half my <token>",
  "Show the top Eden tokens by 24h volume",
  "Claim my creator fees",
];

function Code({ children }: { children: string }) {
  return <pre className="doc-code"><code>{children.trim()}</code></pre>;
}

export function DocsAgents() {
  return (
    <>
      <section id="agents">
        <h2>AI agents</h2>
        <p>AI agents (Claude, Codex, OpenClaw and any Agent Skills client) can launch, trade, claim fees and read markets on Eden. They build with Eden's API, verify every transaction locally, and sign on the user's own machine; keys never leave it.</p>
        <h3>Set up</h3>
        <Code>{`
export EDEN_PRIVATE_KEY=0x…          # the signing wallet
export EDEN_MAX_HYPE_PER_TRADE=1     # the most one trade or launch may spend
export EDEN_MAX_HYPE_PER_DAY=5       # the most per UTC day`}</Code>
        <p>Set these in your environment, never in the chat. Every write is a dry run until you confirm.</p>
        <h3>Safety</h3>
        <ul>
          <li>Every transaction is verified before signing: chain, contract, amounts, minimum out, and a simulation.</li>
          <li>Spending caps per trade and per day.</li>
          <li>Never raises slippage on its own.</li>
          <li>Respects the launch limits: 2 a day, 10 a month.</li>
        </ul>
        <h3>Example prompts</h3>
        <ul className="agent-prompts">{PROMPTS.map((p) => <li key={p}><span className="mono">{p}</span></li>)}</ul>
      </section>

      <section id="agents-skills">
        <h2>Install a skill</h2>
        <p>Paste the line into your agent. Skills are in <a href="https://github.com/EdenFamily/eden-skills" target="_blank" rel="noreferrer">EdenFamily/eden-skills</a>.</p>
        <div className="panel tex tscroll">
          <table className="dtable agent-skills">
            <thead><tr><th>Skill</th><th>Paste into your agent</th></tr></thead>
            <tbody>
              {SKILLS.map(([name, dir, what]) => {
                const line = `Install the skill ${RAW}/${dir}/SKILL.md`;
                return (
                  <tr key={dir}>
                    <td><b>{name}</b><div className="faint" style={{ fontSize: 12.5 }}>{what}</div></td>
                    <td><span className="agent-line"><span className="mono">{line}</span><Copy value={line} label={`Copy the ${name} install line`} /></span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section id="agents-sdks">
        <h2>SDKs</h2>
        <p><b>TypeScript</b>: <a href="https://github.com/EdenFamily/eden-sdk" target="_blank" rel="noreferrer">EdenFamily/eden-sdk</a></p>
        <Code>{"npm install github:EdenFamily/eden-sdk viem"}</Code>
        <p><b>Python</b>: <a href="https://github.com/EdenFamily/eden-sdk-python" target="_blank" rel="noreferrer">EdenFamily/eden-sdk-python</a></p>
        <Code>{`pip install "eden-sdk @ git+https://github.com/EdenFamily/eden-sdk-python"`}</Code>
        <p>Both use the public <a href="#api">API</a> and verify what it builds before anything is signed.</p>
      </section>
    </>
  );
}

import { useEffect, useState } from "react";
import { api } from "./lib/api";
import { restore, signMessage, useWallet } from "./lib/wallet";
import { usePath } from "./components/router";
import { Shell } from "./components/Shell";
import { Toast, toast } from "./components/ui";
import { Create } from "./pages/Create";
import { Brand } from "./pages/Brand";
import { Docs } from "./pages/Docs";
import { Explore } from "./pages/Explore";
import { Portfolio } from "./pages/Portfolio";
import { Referrals } from "./pages/Referrals";
import { TokenPage } from "./pages/TokenPage";
import { LinkResult } from "./pages/LinkResult";
import { Legal } from "./pages/Legal";
import { Waiting } from "./pages/Waiting";
import { Builders } from "./pages/Builders";

/** Before mainnet launch: "/" is the waiting page; only docs, brand kit and the legal pages are open. */
export const PRELAUNCH = import.meta.env.VITE_PRELAUNCH === "1";

/** A visitor who arrives through ?ref=<code> is asked once, after connecting, to sign the referral binding. */
function useReferralBinding() {
  const w = useWallet();
  useEffect(() => {
    const code = new URLSearchParams(location.search).get("ref");
    if (code) try { localStorage.setItem("eden-ref", code.toLowerCase()); } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => {
    let code: string | null = null;
    try { code = localStorage.getItem("eden-ref"); } catch { /* storage unavailable */ }
    if (!w.address || !code) return;
    void (async () => {
      try {
        const { message } = await api.referralMessage(w.address!, code!);
        const res = await api.bindReferral(w.address!, code!, await signMessage(message));
        if (res.status === "bound") toast("You joined through a referral link");
      } catch { /* not found, self-referral or declined: nothing to do */ }
      try { localStorage.removeItem("eden-ref"); } catch { /* storage unavailable */ }
    })();
  }, [w.address]);
}

export function App() {
  const path = usePath();
  if (PRELAUNCH) return <Prelaunch path={path} />;
  return <Live path={path} />;
}

function Prelaunch({ path }: { path: string }) {
  const page = path.startsWith("/docs") ? <Docs /> : path.startsWith("/brand") ? <Brand />
    : path.startsWith("/terms") ? <Legal kind="terms" /> : path.startsWith("/privacy") ? <Legal kind="privacy" />
    : path.startsWith("/builders") ? <Builders /> : null;
  useEffect(() => { if (!location.hash) scrollTo(0, 0); }, [path]);
  if (!page) return <Waiting />;
  return <><Shell search="" onSearch={() => {}} prelaunch>{page}</Shell><Toast /></>;
}

function Live({ path }: { path: string }) {
  const [search, setSearch] = useState("");
  useEffect(() => { void restore(); }, []);
  useReferralBinding();
  const token = path.match(/^\/token\/(0x[0-9a-fA-F]{40})/)?.[1];
  const page = token ? <TokenPage key={token} address={token.toLowerCase()} />
    : path.startsWith("/create") ? <Create />
    : path.startsWith("/portfolio") ? <Portfolio />
    : path.startsWith("/referrals") ? <Referrals />
    : path.startsWith("/docs") ? <Docs />
    : path.startsWith("/brand") ? <Brand />
    : path.startsWith("/link") ? <LinkResult />
    : path.startsWith("/terms") ? <Legal kind="terms" />
    : path.startsWith("/privacy") ? <Legal kind="privacy" />
    : path.startsWith("/builders") ? <Builders />
    : <Explore search={search} />;
  return <><Shell search={search} onSearch={setSearch}>{page}</Shell><Toast /></>;
}

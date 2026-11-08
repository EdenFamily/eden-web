import { api } from "../lib/api";
import { useWallet } from "../lib/wallet";
import { PlatformMark } from "./Creator";
import { useData } from "./ui";

/**
 * "Link your X" for a connected wallet whose X isn't linked yet, shown only when X linking is set up on the server.
 * Linking shows the handle as creator and lets the wallet launch from X and earn the fees there.
 */
export function LinkXNudge() {
  const w = useWallet();
  const links = useData(() => (w.address ? api.creator(w.address.toLowerCase()) : Promise.resolve(undefined)), [w.address]);
  const platforms = useData(() => api.oauthPlatforms(), []);
  if (!w.address || !platforms.data?.x || !links.data || links.data.x) return null;
  return (
    <div className="linkx" role="note">
      <span className="linkx-ic"><PlatformMark platform="x" /></span>
      <span><b>Link your X.</b> Your handle shows as the creator, and you can launch from X by tagging @EdenOnElysium and earn the creator fees.</span>
      <a className="btn btn-quiet btn-sm" href={api.oauthStartUrl("x", w.address)}>Link X</a>
    </div>
  );
}

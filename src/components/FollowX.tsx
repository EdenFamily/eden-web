import { I } from "./icons";

/** Eden's X account (VITE_X_URL), the one people tag to launch from X. */
export const X_URL = String(import.meta.env.VITE_X_URL || "https://x.com/EdenOnElysium").trim();

export function FollowX({ className = "btn btn-quiet" }: { className?: string }) {
  return (
    <a className={`${className} follow-x`} href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="Follow Eden on X">
      {I.x(15)}Follow on X
    </a>
  );
}

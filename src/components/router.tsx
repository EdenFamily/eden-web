import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from "react";

const subs = new Set<() => void>();
window.addEventListener("popstate", () => subs.forEach((s) => s()));

export function navigate(to: string): void {
  if (to === location.pathname + location.search) return;
  history.pushState(null, "", to);
  window.scrollTo(0, 0);
  subs.forEach((s) => s());
}

export function usePath(): string {
  return useSyncExternalStore((s) => (subs.add(s), () => void subs.delete(s)), () => location.pathname);
}

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return (
    <a {...rest} href={to} onClick={(e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(to);
    }} />
  );
}

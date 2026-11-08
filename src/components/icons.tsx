import type { SVGProps } from "react";

const base = (size: number): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
});

export const I = {
  explore: (s = 18) => <svg {...base(s)}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></svg>,
  create: (s = 18) => <svg {...base(s)}><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M12 8v8M8 12h8" /></svg>,
  portfolio: (s = 18) => <svg {...base(s)}><rect x="3" y="7" width="18" height="13" rx="3" /><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" /></svg>,
  referrals: (s = 18) => <svg {...base(s)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14a6.5 6.5 0 0 1 3 6" /></svg>,
  perps: (s = 18) => <svg {...base(s)}><path d="M4 18l5-6 4 3 7-9" /><path d="M15 6h5v5" /></svg>,
  docs: (s = 18) => <svg {...base(s)}><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></svg>,
  signin: (s = 18) => <svg {...base(s)}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4" /></svg>,
  search: (s = 16) => <svg {...base(s)} strokeWidth={1.8}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  sun: (s = 16) => <svg {...base(s)} strokeWidth={1.8}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>,
  moon: (s = 16) => <svg {...base(s)} strokeWidth={1.8}><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></svg>,
  wallet: (s = 17) => <svg {...base(s)}><path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4h-12A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" /><path d="M21 10h-5a2 2 0 0 0 0 4h5z" /></svg>,
  share: (s = 14) => <svg {...base(s)} strokeWidth={2}><path d="M4 12v8h16v-8M12 3v13M7 8l5-5 5 5" /></svg>,
  download: (s = 14) => <svg {...base(s)} strokeWidth={2}><path d="M4 16v4h16v-4M12 3v13M7 11l5 5 5-5" /></svg>,
  copy: (s = 12) => <svg {...base(s)} strokeWidth={1.8}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>,
  x: (s = 13) => <svg {...base(s)} strokeWidth={1.8}><path d="M4 4h4.5L20 20h-4.5zM19.5 4l-6.6 7.2M4.5 20l6.6-7.2" /></svg>,
  telegram: (s = 13) => <svg {...base(s)} strokeWidth={1.8}><path d="M21 4 3 11l6 2 2 6 3-4 5 4z" /></svg>,
  globe: (s = 13) => <svg {...base(s)} strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>,
  back: (s = 16) => <svg {...base(s)} strokeWidth={2}><path d="m15 18-6-6 6-6" /></svg>,
  next: (s = 16) => <svg {...base(s)} strokeWidth={2}><path d="m9 18 6-6-6-6" /></svg>,
  plus: (s = 14) => <svg {...base(s)} strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>,
  flip: (s = 16) => <svg {...base(s)} strokeWidth={1.8}><path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" /></svg>,
};

/** Eden's E. "word" sits with the DEN letters of the wordmark; "icon" is the E on its orb. Light themes get the deeper on-light file. */
/** Eden's logo: the EDEN wordmark (theme-aware), or the E on the dark orb for square spots. */
export function Mark({ size = 20, kind = "word" }: { size?: number; kind?: "word" | "icon" }) {
  if (kind === "icon") return <img className="mark" src="/brand/eden-icon.svg?v=w1" width={size} height={size} alt="" />;
  const width = Math.round(size * 4.39);
  return <>
    <img className="mark on-dark" src="/brand/eden-wordmark.svg?v=w1" width={width} height={size} alt="Eden" />
    <img className="mark on-light" src="/brand/eden-wordmark-onlight.svg?v=w1" width={width} height={size} alt="Eden" />
  </>;
}

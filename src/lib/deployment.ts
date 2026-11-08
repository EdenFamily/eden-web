import type { Address } from "viem";

/** Eden's contracts on Elysium mainnet (chain 99901), from elysium-launchpad/records/mainnet-deployment.json. */
export const MAINNET = {
  factory: "0x7260894d5f782844a60ec3689c001cd8ac65f4b1",
  launchAndBuy: "0x50f7cd75af1e8f98649e5fa12ecddc3a4f240f4c",
  feeEscrow: "0xc66b848a79676b39c0e51f3d6e43596beab868e9",
  memeHook: "0x6132342bDdd14e6A0d1cbCAA3a7b6299AC2D2044",
  locker: "0x9baa4bd69cb93f01e1b4a4632bd7a882bbab989f",
  buybackVault: "0x5b734cb2412e3ed5acca8869719593642c20b833",
  graduationExecutor: "0xfc3754655e2622a4c396c0d9868c193f4c636d3a",
  graduationGuard: "0x3d0EF994C5478B253a3BdBDD4E7a6f84bFe101E4",
  launchDeployer: "0xa36163be33e7795387c7e40c0a9505e27072aa1a",
} as const satisfies Record<string, Address>;

/** The table in the docs: what each contract does, in the reader's words. */
export const CONTRACT_ROWS: [string, Address][] = [
  ["Launch factory", MAINNET.factory],
  ["Launch and buy", MAINNET.launchAndBuy],
  ["Creator fee escrow", MAINNET.feeEscrow],
  ["Uniswap V4 hook (pool fees)", MAINNET.memeHook],
  ["Liquidity locker", MAINNET.locker],
  ["Buyback vault", MAINNET.buybackVault],
  ["Graduation executor", MAINNET.graduationExecutor],
  ["Graduation guard", MAINNET.graduationGuard],
  ["Launch deployer", MAINNET.launchDeployer],
];

/** Launch config 0 on mainnet: the curve's virtual HYPE reserve and the HYPE raised at graduation (71.4% of supply sold). */
export const PHANTOM_HYPE = 76.0483;
export const GRADUATION_HYPE = 190.12075;

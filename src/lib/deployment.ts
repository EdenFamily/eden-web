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

/** How config 0 splits the supply at graduation (r = graduation ÷ phantom): sold on the curve, seeded into the pool, locked. */
const R = GRADUATION_HYPE / PHANTOM_HYPE;
export const SUPPLY_SPLIT = { sold: R / (1 + R), pool: R / (1 + R) ** 2, locked: 1 - R / (1 + R) - R / (1 + R) ** 2 };

/** Public source and machine-readable records. */
export const SOURCE_URL = "https://github.com/EdenFamily/eden-contracts";
export const DEPLOYMENT_JSON_URL = "https://github.com/EdenFamily/eden-contracts/blob/main/deployments/elysium-mainnet.json";

/** Full ABIs served from /abi/<file>. The bonding curve and launch token are deployed per launch, so they have no fixed address. */
export const ABIS: { name: string; file: string; address?: Address }[] = [
  { name: "Launch factory", file: "EdenLaunchFactory.json", address: MAINNET.factory },
  { name: "Launch and buy", file: "EdenLaunchAndBuy.json", address: MAINNET.launchAndBuy },
  { name: "Bonding curve", file: "EdenBondingCurve.json" },
  { name: "Launch token", file: "EdenLauncherToken.json" },
  { name: "Fee escrow", file: "EdenFeeEscrow.json", address: MAINNET.feeEscrow },
  { name: "Uniswap V4 hook", file: "EdenMemeHook.json", address: MAINNET.memeHook },
  { name: "Liquidity locker", file: "EdenLaunchLocker.json", address: MAINNET.locker },
  { name: "Buyback vault", file: "EdenBuybackVault.json", address: MAINNET.buybackVault },
  { name: "Graduation executor", file: "EdenGraduationExecutor.json", address: MAINNET.graduationExecutor },
  { name: "Launch deployer", file: "EdenLaunchDeployer.json", address: MAINNET.launchDeployer },
];

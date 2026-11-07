#!/usr/bin/env bash
# Writes .env.local for the local Elysium mirror from the deployment record (elysium-launchpad/scripts/dev-chain.sh).
set -euo pipefail
D=${1:-/home/xnik/elysium-launchpad/records/fork-deployment.json}
python3 -I - "$D" > "$(dirname "$0")/../.env.local" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
print(f"VITE_CHAIN_ID={d['chainId']}")
print("VITE_RPC_URL=http://127.0.0.1:8590")
print("VITE_EXPLORER_URL=")
for k in ("factory", "launchAndBuy", "feeEscrow"):
    print(f"VITE_{k.upper()}={d[k]}")
print(f"VITE_LAUNCH_FEE_WEI={d['launchFee']}")
PY
echo "wrote .env.local"

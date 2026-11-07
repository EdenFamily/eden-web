# Eden website

React + Vite + TypeScript front end for the Eden launchpad on Elysium (chain 99901). It talks to the Eden server
(`/home/xnik/eden`, port 8790) through `/api` and `/ws`, and to the chain with `viem` through the user's wallet.

## Run (local Elysium)

```
../elysium-launchpad/scripts/dev-chain.sh   # local Elysium on :8590 with Eden deployed
(cd ../eden && pnpm start)                   # server on :8790
scripts/dev-env.sh                           # writes .env.local from the deployment record
./node_modules/.bin/vite --host 127.0.0.1 --port 5180
```

Open http://localhost:5180 (use `localhost`, not `127.0.0.1`: the X/TikTok link cookie is set on that host).

## Pages

Explore (`/`), token page (`/token/:address`), Create (`/create`), Portfolio (`/portfolio`), Referrals (`/referrals`),
Docs (`/docs`), and `/link` (return page after linking X or TikTok).

## Notes

- Every transaction the site builds ends its calldata with Eden's marker `4544454e0001`.
- Buy and sell trade on the bonding curve; trading graduated tokens through Uniswap V4 is the next slice.
- Token images upload to IPFS once Pinata keys are configured; until then tokens show generated art.
- Theme follows the system and can be switched; the choice is remembered per browser.

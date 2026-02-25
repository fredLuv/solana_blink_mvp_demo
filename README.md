# Solana Blink MVP (Axum)

Minimal Blink-compatible backend with two actions: `tip` and `checkout`.

- `GET /actions.json` exposes routing rules.
- `GET /api/actions/tip` returns action metadata and parameters.
- `POST /api/actions/tip?to=<pubkey>&amount=<sol>` returns an unsigned SOL transfer transaction.
- `GET /api/actions/checkout` returns shop checkout metadata.
- `POST /api/actions/checkout?sku=<coffee|sticker|hoodie>&qty=<1-20>` returns an unsigned shop payment transaction.

## Run

```bash
cd /Users/fred/GPT-CODE/solana-blink-mvp-axum
cp .env.example .env
cargo run
```

## Quick test

```bash
curl http://localhost:3000/actions.json

curl http://localhost:3000/api/actions/tip

curl -X POST "http://localhost:3000/api/actions/tip?to=DAw5ebjQBFruAFb7aehTTdbWixeTS3oS1BUAiZtKAvea&amount=0.01" \
  -H "Content-Type: application/json" \
  -d '{"account":"YOUR_WALLET_PUBKEY"}'

curl -X POST "http://localhost:3000/api/actions/checkout?sku=coffee&qty=2&skip_balance_check=true" \
  -H "Content-Type: application/json" \
  -d '{"account":"YOUR_WALLET_PUBKEY"}'
```

The POST response includes base64 transaction bytes for a wallet client to sign and send.

For demo use without a funded devnet account, append `&skip_balance_check=true` to still get an unsigned transaction payload.

## React scaffold frontend

```bash
cd /Users/fred/GPT-CODE/solana-blink-mvp-axum/frontend-react
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173` and click **Generate Checkout Tx**.

The page calls:
- `GET /actions.json`
- `GET /api/actions/checkout`
- `POST /api/actions/checkout?...`

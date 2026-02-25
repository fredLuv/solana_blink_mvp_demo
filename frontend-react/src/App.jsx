import { useMemo, useState } from "react";

const SHOP_ITEMS = [
  {
    sku: "coffee",
    name: "Drift Coffee",
    description: "Single origin cup from the validator cafe",
    priceSol: 0.015,
    imageUrl: "/images/coffee.svg"
  },
  {
    sku: "sticker",
    name: "Blink Sticker Pack",
    description: "Three holo stickers for your laptop",
    priceSol: 0.006,
    imageUrl: "/images/stickers-pack.svg"
  },
  {
    sku: "hoodie",
    name: "Validator Hoodie",
    description: "Heavyweight hoodie with node-map print",
    priceSol: 0.08,
    imageUrl: "/images/hoodie-folded.svg"
  }
];

const DEFAULTS = {
  baseUrl: "http://127.0.0.1:3000",
  account: "11111111111111111111111111111111",
  qty: 1,
  sku: "coffee",
  skipBalanceCheck: true
};

function pretty(data) {
  return JSON.stringify(data, null, 2);
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState(DEFAULTS.baseUrl);
  const [account, setAccount] = useState(DEFAULTS.account);
  const [qty, setQty] = useState(DEFAULTS.qty);
  const [sku, setSku] = useState(DEFAULTS.sku);
  const [skipBalanceCheck, setSkipBalanceCheck] = useState(DEFAULTS.skipBalanceCheck);

  const [manifest, setManifest] = useState("");
  const [metadata, setMetadata] = useState("");
  const [checkout, setCheckout] = useState("");
  const [message, setMessage] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [debugTrace, setDebugTrace] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedItem = useMemo(() => SHOP_ITEMS.find((i) => i.sku === sku) || SHOP_ITEMS[0], [sku]);
  const totalSol = useMemo(() => (selectedItem.priceSol * Number(qty || 0)).toFixed(6), [selectedItem, qty]);

  const checkoutUrl = useMemo(() => {
    const qs = new URLSearchParams({ sku, qty: String(qty) });
    if (skipBalanceCheck) {
      qs.set("skip_balance_check", "true");
    }
    return `${baseUrl}/api/actions/checkout?${qs.toString()}`;
  }, [baseUrl, qty, sku, skipBalanceCheck]);

  async function requestJson(url, options) {
    const startedAt = performance.now();
    const method = options?.method || "GET";
    const requestBody = options?.body ? JSON.parse(options.body) : null;
    const res = await fetch(url, options);
    const elapsedMs = Math.round(performance.now() - startedAt);
    const body = await res.json().catch(() => ({}));
    const responseHeaders = {};
    for (const [key, value] of res.headers.entries()) {
      responseHeaders[key] = value;
    }

    const trace = {
      request: {
        url,
        method,
        body: requestBody
      },
      response: {
        status: res.status,
        ok: res.ok,
        elapsedMs,
        headers: responseHeaders,
        body
      }
    };

    if (!res.ok) {
      throw new Error(body.message || `Request failed: ${res.status}`);
    }
    return { body, trace };
  }

  async function runCheckoutDemo() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const [manifestResult, metadataResult] = await Promise.all([
        requestJson(`${baseUrl}/actions.json`),
        requestJson(`${baseUrl}/api/actions/checkout`)
      ]);

      setManifest(pretty(manifestResult.body));
      setMetadata(pretty(metadataResult.body));

      const postResult = await requestJson(checkoutUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account })
      });

      setCheckout(pretty(postResult.body));
      setMessage(postResult.body.message || "Checkout transaction generated.");

      const transactionBase64 = postResult.body.transaction || "";
      setDebugTrace(
        pretty({
          calls: {
            actionsJson: manifestResult.trace,
            checkoutMetadata: metadataResult.trace,
            checkoutPost: postResult.trace
          },
          derived: {
            checkoutUrl,
            transactionBase64Chars: transactionBase64.length,
            transactionPreview: transactionBase64.slice(0, 96)
          }
        })
      );
    } catch (err) {
      setError(err.message);
      setDebugTrace(
        pretty({
          error: err.message,
          checkoutUrl
        })
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Blink Checkout</p>
        <h1>Pay Merchant</h1>
        <p className="subhead">Wallet-style payment sheet powered by a Solana Blink checkout action.</p>
      </section>

      <section className="shop-grid" aria-label="Items">
        {SHOP_ITEMS.map((item) => (
          <button
            key={item.sku}
            className={`item-card ${item.sku === sku ? "active" : ""}`}
            onClick={() => setSku(item.sku)}
            type="button"
          >
            <img src={item.imageUrl} alt={item.name} className="item-photo" loading="lazy" />
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <strong>{item.priceSol} SOL</strong>
          </button>
        ))}
      </section>

      <section className="sheet">
        <div className="sheet-head">
          <img src={selectedItem.imageUrl} alt={selectedItem.name} className="hero-photo" />
          <div>
            <p className="merchant">Orbitflare Shop</p>
            <h2>{selectedItem.name}</h2>
            <p>{selectedItem.description}</p>
          </div>
          <strong>{selectedItem.priceSol} SOL each</strong>
        </div>

        <div className="line-items">
          <label>
            Quantity
            <input
              type="number"
              min="1"
              max="20"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value || 1))))}
            />
          </label>
          <div className="totals">
            <span>Subtotal</span>
            <span>{totalSol} SOL</span>
            <span>Network fee</span>
            <span>~0.000005 SOL</span>
            <strong>Total</strong>
            <strong>{(Number(totalSol) + 0.000005).toFixed(6)} SOL</strong>
          </div>
        </div>

        <div className="shopper">
          <label>
            Shopper wallet (payer pubkey)
            <input value={account} onChange={(e) => setAccount(e.target.value.trim())} />
          </label>
        </div>

        <button className="pay-btn" onClick={runCheckoutDemo} disabled={loading}>
          {loading ? "Authorizing..." : `Pay ${(Number(totalSol) + 0.000005).toFixed(6)} SOL`}
        </button>
        {message ? <p className="ok">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}

        <div className="inline">
          <label className="toggle">
            <input
              type="checkbox"
              checked={skipBalanceCheck}
              onChange={(e) => setSkipBalanceCheck(e.target.checked)}
            />
            Demo mode (skip balance check)
          </label>
          <button className="ghost" onClick={() => setShowDebug((v) => !v)} type="button">
            {showDebug ? "Hide Technical Details" : "Show Technical Details"}
          </button>
        </div>
      </section>

      {showDebug ? (
        <section className="results">
          <article>
            <h2>actions.json</h2>
            <pre>{manifest || "(not loaded)"}</pre>
          </article>
          <article>
            <h2>GET /api/actions/checkout</h2>
            <pre>{metadata || "(not loaded)"}</pre>
          </article>
          <article>
            <h2>POST /api/actions/checkout</h2>
            <pre>{checkout || "(not loaded)"}</pre>
          </article>
          <article>
            <h2>Checkout URL</h2>
            <code>{checkoutUrl}</code>
          </article>
          <article>
            <h2>Request/Response Trace</h2>
            <pre>{debugTrace || "(not loaded)"}</pre>
          </article>
          <article>
            <h2>API base URL</h2>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value.trim())} />
          </article>
        </section>
      ) : null}
      <section className="hint">
        <p>For real wallet signing and send, connect Phantom/Backpack next and submit `transaction` via `sendTransaction`.</p>
      </section>
    </main>
  );
}

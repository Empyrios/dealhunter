# DealHunter v1.0

A standalone, UK-focused, mobile-first and dark-only personal price observation app. Built for the Empyrios AppHub ecosystem, but usable without any ChatGPT account or paid service.

## Why it exists

Sale banners can be misleading. DealHunter helps build **your own** product and retailer price history so you can make purchases with real context. It never fabricates live quotes, discount percentages, stock status or deal rankings.

**This release does not fetch retailer prices automatically.** Every observation is entered by the user, timestamped and labelled `manual`. Signals compare recorded prices and are not live availability claims. Check the retailer before buying. There are no notifications while the app is closed.

## What works

- **Overview:** historical price signals, watchlist totals, price record counts and stale data indicators.
- **Watchlist:** add, edit, archive, purchase, delete; brand and model notes; product category, item condition, priority and personal price target.
- **Price observations:** log retailer, date, item price, shipping, optional retailer URL. Each observation is independently removable.
- **Product detail:** price-history graph, historical min/median/max, 30/90-day medians, last observation by retailer, target status, historical evidence quality.
- **Signal board:** best last observed total reaching a target, recorded low, or sufficiently supported under-30-day-median signal.
- **Insights:** category distribution, historic coverage indicators and recent observation log.
- **Settings:** full JSON backup and validated restore, safe CSV export, optional clearly labelled fictional demo data, local reset.
- **Offline-ready:** PWA, offline shell after first successful online load, zero runtime dependencies, no analytics and no remote requests.

Prices are in GBP, and shipping is included in comparisons. This version deliberately does not use stock art, links to recommended products or paid affiliate deals.

## How to run

Requires no npm install. From the repository root:

```bash
python3 -m http.server 8000 --directory site
```

Open http://localhost:8000/.

```bash
npm run verify        # Syntax checks and 31 Node unit tests
python3 tests/browser-check.py # Optional browser smoke test (requires playwright and Chromium)
```

The browser test uses in-memory ES module loading because some controlled environments block localhost navigation. It tests the app's UI and a simulated `localStorage` API, but does **not** validate GitHub Pages production network delivery or real offline Service Worker behaviour. Real-device tests are still necessary.

## Deployment

Create an independent **public** GitHub repository named `Empyrios/dealhunter`, upload these files to its root and enable **Settings → Pages → Source: GitHub Actions**. The included workflow tests on Node.js 24 and deploys the `site/` folder. After successful deployment, the normal project URL is:

https://empyrios.github.io/dealhunter/

This is an expected URL, not a guarantee of live deployment. Do not mark DealHunter built in AppHub until the live site and deployment are verified.

All asset URLs are relative so GitHub Pages project subdirectories work.

## Privacy, portability and limitations

- Data lives only in this browser's `localStorage` at `empyrios-dealhunter-v1`. It is not encrypted, synced between devices or backed up automatically. It can be lost if the browser clears its storage.
- Export a JSON backup to preserve your data and transfer it between devices.
- Imports are validated: schema version, bounded sizes, data types, safe HTTP(S) links, price decimals, valid dates and unique identifiers. The maximum JSON file size is 8 MB, 2,000 products and 100,000 observations.
- CSV export prefixes potentially spreadsheet-executable strings before quoting them.
- Notes, titles and retailer names are escaped before insertion into HTML. Links are validated and opened with `noopener noreferrer`.
- Data from fictional demo entries is clearly marked as synthetic. Demo prices and retailer names are not real offers.
- Historical confidence reflects the number of distinct days with records, not actual market coverage, completeness or data accuracy.
- Targets are evaluated from recorded observations. A stale last-recorded price can still trigger a signal, and is clearly flagged.
- Product condition and shipping matter. Different configurations or refurbished/new listings should be tracked as separate products.

## Architecture

| File | Responsibility |
|---|---|
| `site/index.html` | Document shell and PWA manifest |
| `site/styles.css` | Dark-only responsive interface |
| `site/app.mjs` | Routes, UI, form controls, local persistence |
| `site/engine.mjs` | Pure price arithmetic, validation, evidence calculations, CSV/JSON |
| `site/demo.mjs` | Explicitly fictional opt-in sample records |
| `site/sw.js` | Static application shell offline cache |
| `tests/engine.test.mjs` | Domain arithmetic, validation and security tests |
| `tests/browser-check.py` | 390px mobile / 1440px desktop interaction smoke checks |
| `.github/workflows/deploy.yml` | GitHub Pages verification and deployment |

### Next engineering upgrades

1. **Authorised automatic data capture:** model retailer connectors as explicit source adapters with permissions, quotas, provenance and retry/backoff. Never bypass anti-bot systems or fabricate a successful observation.
2. **Monitoring:** server-side scheduled polling and optional notifications only after a compliant retailer integration exists; separate fresh checks from cached historical data.
3. **Price intelligence:** matched SKU variants, condition-specific offers, sale period detection with sufficient baseline data, weighted observed retail medians and retailer confidence.
4. **Price data portability:** product groups, import from user-owned retailer history where terms permit, bulk observation entry and deduplication.
5. **Local encrypted backup:** optional user-supplied passphrase and account-free restore, with explicit cryptographic model and tested recovery.
6. **Analytics:** price variance, volatility windows, false-sale diagnostics (only if enough reliable evidence), Bayesian signal confidence and transparent formulas.
7. **Mobile:** actual Android PWA tests, service worker offline tests, robust storage migration and optional low-storage handling.

Do not add marketing, affiliate links or sponsored placements without the owner's request.

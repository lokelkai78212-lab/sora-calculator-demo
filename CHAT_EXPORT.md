# Conversation Transcript: Singapore SORA Calculator & MAS Serverless Integration

**Date**: October 5, 2026  
**Application**: Singapore SORA Mortgage & Interest Calculator  
**Repository**: [lokelkai78212-lab/sora-calculator-demo](https://github.com/lokelkai78212-lab/sora-calculator-demo)

---

## 1. Initial Prompt & Feature Brief

### User Request
> "build me a simple singapore based sora calculator that reads MAS backend overnight rates for calculating interest payments accurately and efficiently. Just the frontend for now, i will included the backend integration later."

### Summary of Implementation
- **MAS Compounding Formula Engine**:
  Implemented the official Monetary Authority of Singapore (MAS) / SC-STS compounding formula:
  $$\text{Compounded SORA} = \left[ \prod_{i=1}^{d_b} \left( 1 + \frac{r_i \times n_i}{365} \right) - 1 \right] \times \frac{365}{d} \times 100$$
  using the Singapore money market Actual/365 convention with weekend carry-over weighting ($n_i = 3$ on Fridays).
- **Core Modules Built**:
  1. `MortgageCalculator.tsx`: Singapore residential loan payment calculator with SGD loan amounts, tenure selection (up to 35 years), 1M/3M/6M SORA benchmarks, stepped bank spreads (Year 1, Year 2, Year 3, Thereafter) vs flat spread, monthly amortization, and CSV export.
  2. `DailyCompoundingCalculator.tsx`: Actual/365 day-by-day overnight compounding engine for commercial/term facilities with daily rate weights and factor breakdowns.
  3. `PackageComparison.tsx`: Comparison of leading Singapore bank packages (DBS 3M SORA, OCBC 1M SORA, UOB, Standard Chartered, and 2-Year Fixed Rate).
  4. `TdsrStressTest.tsx`: Singapore MAS Notice 645 compliance calculator with 4.00% statutory stress rate floor, 30% variable income haircut, and 55% TDSR / 30% MSR thresholds.
  5. `SoraRateExplorer.tsx`: Interactive multi-series rate curves for Daily SORA, 1M, 3M, 6M, SORA Index, and aggregate volume.
  6. `BackendIntegrationModal.tsx`: Visual modal detailing the JSON schema, REST endpoint, and test ping capabilities for upcoming backend connection.

---

## 2. Git Repository Initialization & Remote Push

### User Request
> "git push [REDACTED_CREDENTIALS]@github.com/lokelkai78212-lab/sora-calculator-demo.git"

### Action Taken
- Initialized empty git repository.
- Configured user credentials:
  - Name: `laykuan.loke`
  - Email: `laykuan.loke@gmail.com`
- Committed initial application files (`main` branch):
  - Commit `62391d1`: *"Initial commit: Singapore SORA Calculator frontend"*
- Successfully pushed to remote repository `https://github.com/lokelkai78212-lab/sora-calculator-demo.git`.

---

## 3. Serverless MAS API Gateway Integration

### User Request
> "add a serverless connection that pulls MAS data using the following end points:
> - Store this in /api folder (at project root level) NOT src file
> - include /health.ts and /sora.ts within the same subfolder
> - do not hardcode any api keys, i will include them manually
> 
> # Daily SORA + compounded 1M/3M/6M averages:
> https://eservices.mas.gov.sg/apimg-gw/server/monthly_statistical_bulletin_non610mssql/domestic_interest_rates_daily/views/domestic_interest_rates_daily
> 
> # All requests need the header: KeyId: <MAS_KEY_ID>"

### Implementation Details

#### `/api/health.ts`
- Healthcheck endpoint reporting uptime, node environment, and verifying if `MAS_KEY_ID` is present.
- Returns status code 200 with JSON payload:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-05T08:00:15.067Z",
    "uptimeSeconds": 11,
    "environment": {
      "nodeEnv": "development",
      "masKeyConfigured": false
    },
    "endpoints": {
      "sora": "/api/sora",
      "health": "/api/health"
    }
  }
  ```

#### `/api/sora.ts`
- Connects directly to the MAS API Gateway:
  `https://eservices.mas.gov.sg/apimg-gw/server/monthly_statistical_bulletin_non610mssql/domestic_interest_rates_daily/views/domestic_interest_rates_daily`
- Injects required authentication header:
  `KeyId: <MAS_KEY_ID>`
- **No hardcoded keys**: Automatically resolves from:
  1. `process.env.MAS_KEY_ID` (from `.env` / environment variables)
  2. Request headers (`KeyId`, `x-mas-key-id`, or `Authorization: Bearer <key>`)
  3. Query string (`?keyId=...`)
- Returns HTTP 401 with helpful instructions if no key is provided.
- Normalizes MAS records: `date`, `sora`, `comp_sora_1m`, `comp_sora_3m`, `comp_sora_6m`, `sora_index`, `aggr_vol`.
- Implements 5-minute in-memory caching to avoid rate-limiting on MAS servers.

#### `/server.ts` & `package.json`
- Created Express full-stack server mounting `/api/health` and `/api/sora` alongside Vite SPA middlewares on port 3000.
- Updated `package.json`:
  ```json
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build",
    "start": "node server.ts",
    "preview": "vite preview",
    "clean": "rm -rf dist server.js",
    "lint": "tsc --noEmit"
  }
  ```
- Documented `MAS_KEY_ID` in `/.env.example`.

#### Remote Sync
- Committed and pushed changes:
  - Commit `e00fc9c`: *"feat: Add serverless /api endpoints for MAS SORA gateway with KeyId support"*
- Pushed to `origin/main` on GitHub.

---

## 4. Architecture & File Tree

```
/
├── api/
│   ├── health.ts          # Serverless healthcheck endpoint
│   └── sora.ts            # Serverless MAS rates fetcher (KeyId header)
├── src/
│   ├── components/
│   │   ├── BackendIntegrationModal.tsx
│   │   ├── DailyCompoundingCalculator.tsx
│   │   ├── Header.tsx
│   │   ├── MortgageCalculator.tsx
│   │   ├── PackageComparison.tsx
│   │   ├── SoraRateExplorer.tsx
│   │   └── TdsrStressTest.tsx
│   ├── data/
│   │   └── historicalSora.ts
│   ├── services/
│   │   └── masApiService.ts
│   ├── types/
│   │   └── sora.ts
│   ├── utils/
│   │   └── soraMath.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example
├── index.html
├── metadata.json
├── package.json
├── server.ts
├── tsconfig.json
└── vite.config.ts
```

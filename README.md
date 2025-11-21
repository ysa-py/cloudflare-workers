# Ultimate VLESS Proxy Worker

This repository contains a Cloudflare Workers implementation of a VLESS proxy admin + user panel, including a Rust wasm parser for VLESS header parsing, Drizzle D1 schema, HTMX/Alpine frontends, and a CI that builds, obfuscates, tests and deploys to Cloudflare Workers.

## Quick notes
- CI builds: GitHub Actions (`.github/workflows/ci.yml`) will build Rust wasm, compile TypeScript, obfuscate the bundle, run tests, and deploy using `wrangler` and `CF_API_TOKEN`.

## What you must configure in GitHub
1. Add secret `CF_API_TOKEN` (API token with permissions to publish Workers).
2. Optionally set `account_id` in `wrangler.toml` or ensure your `CF_API_TOKEN` has required scope.

## Local build steps
Install prerequisites: Node.js 18+, Rust, wasm-pack.

```bash
# build wasm
cd src/rust
wasm-pack build --target web --out-dir ../rust/pkg
# go back to project root
cd ../../
# install deps
npm install
# build everything (wasm, ts, obfuscate)
npm run build
# run tests
npm test
```

## Deploy
Push to `main` branch or dispatch the workflow. The GitHub Actions workflow will run the build and deploy the worker using the Cloudflare API token.

If you prefer local deploy, install Wrangler and run:

```bash
npm i -g @cloudflare/wrangler
wrangler publish
```

Make sure `wrangler.toml` has `account_id` set or your environment configured accordingly.
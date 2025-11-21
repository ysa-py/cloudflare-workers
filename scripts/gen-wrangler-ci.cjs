#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const wranglerTOML = path.resolve(process.cwd(), 'wrangler.toml');
const outTOML = path.resolve(process.cwd(), 'wrangler.ci.toml');

function main() {
  if (!fs.existsSync(wranglerTOML)) {
    console.error('wrangler.toml not found in project root');
    process.exit(1);
  }

  const raw = fs.readFileSync(wranglerTOML, 'utf8');
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || '';

  let out = raw;
  if (!accountId) {
    console.warn('CLOUDFLARE_ACCOUNT_ID not set; writing wrangler.ci.toml without account_id');
  }

  // If an account_id already exists, replace it. Otherwise, insert after the `name =` line.
  if (/^\s*account_id\s*=\s*".*"/m.test(out)) {
    out = out.replace(/^\s*account_id\s*=\s*".*"/m, accountId ? `account_id = "${accountId}"` : '');
  } else if (accountId) {
    const lines = out.split(/\r?\n/);
    let idx = lines.findIndex(l => /^\s*name\s*=/.test(l));
    if (idx === -1) idx = 0;
    lines.splice(idx + 1, 0, `account_id = "${accountId}"`);
    out = lines.join('\n');
  }

  fs.writeFileSync(outTOML, out, 'utf8');
  console.log('wrote', outTOML);
}

main();

import type { Context } from 'hono';
import { expiryToISO } from './utils/time';

// Lazy-loaded modules
let _renderFuncs: any = null;
let _wasmFuncs: any = null;
let _hono: any = null;
let _schemas: any = null;

async function getHono() {
  if (!_hono) {
    _hono = await import('hono');
  }
  return _hono;
}


async function getSchemas() {
  if (!_schemas) {
    _schemas = await import('./db/schema');
  }
  return _schemas;
}

async function getRenderFuncs() {
  if (!_renderFuncs) {
    const views = await import('./views/adminView');
    const user = await import('./views/userView');
    _renderFuncs = {
      renderAdminLogin: views.renderAdminLogin,
      renderAdminPanel: views.renderAdminPanel,
      renderUserPanel: user.renderUserPanel
    };
  }
  return _renderFuncs;
}

async function getWasmFuncs() {
  if (!_wasmFuncs) {
    _wasmFuncs = await import('./wasm/wasm');
  }
  return _wasmFuncs;
}

type Env = {
  DB: D1Database;
  VLESS_WASM?: any;
  ADMIN_KEY?: string;
  SCAMALYTICS_USERNAME?: string;
  SCAMALYTICS_API_KEY?: string;
  PROXYIPS?: string;
  ADMIN_PATH_PREFIX?: string;
  ROOT_PROXY_URL?: string;
};

let appInstance: any = null;
let initPromise: Promise<void> | null = null;
let tablesInitialized = false;

async function initializeApp() {
  if (initPromise) return initPromise;
  if (appInstance) return;
  
  initPromise = (async () => {
    if (!appInstance) {
      const { Hono } = await getHono();
      appInstance = new Hono<{ Bindings: Env }>();
      await registerRoutes(appInstance);
    }
  })();
  
  return initPromise;
}

async function ensureTablesInitialized(env: Env) {
  if (tablesInitialized || !env.DB) return;
  tablesInitialized = true;
  await ensureTablesExist(env);
}

async function registerRoutes(app: Hono<{ Bindings: Env }>) {

  // Simple helper: add security headers
function addSecurityHeaders(headers: Headers) {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=()');
}

// Admin login
app.post('/admin/login', async (c: any) => {
  const env = c.env;
  const form = await c.req.formData();
  const password = form.get('password')?.toString() || '';
  if (!env.ADMIN_KEY) return c.text('Admin not configured', 503);
  if (password !== env.ADMIN_KEY) return c.text('Invalid', 401);
  // create simple session token
  const token = crypto.randomUUID();
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hashHex = Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
  // store in D1 admin_session
  try {
    await env.DB.prepare('INSERT OR REPLACE INTO admin_session (id, token_hash, expires_at) VALUES (?, ?, ?)')
      .bind('default', hashHex, Math.floor(Date.now()/1000) + 86400)
      .run();
  } catch (e) {
    console.error('admin session store failed', e);
  }
  const headers = new Headers();
  headers.append('Set-Cookie', `auth_token=${token}; HttpOnly; Secure; Path=/; Max-Age=86400; SameSite=Strict`);
  addSecurityHeaders(headers);
  return c.text('OK', 200, { headers });
});

async function hashSHA256Hex(str: string) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function isAdminRequest(c: any) {
  const cookie = c.req.headers.get('cookie') || '';
  const token = cookie.match(/auth_token=([^;]+)/)?.[1];
  if (!token) return false;
  const hashed = await hashSHA256Hex(token);
  try {
    const row = await c.env.DB.prepare('SELECT token_hash FROM admin_session WHERE id = ?').bind('default').first();
    if (!row?.token_hash) return false;
    return hashed === row.token_hash;
  } catch (e) {
    console.warn('isAdminRequest error', e);
    return false;
  }
}

async function ensureTablesExist(env: Env) {
  if (!env.DB) return;
  const create = [
    `CREATE TABLE IF NOT EXISTS users (
      uuid TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expiration_date TEXT NOT NULL,
      expiration_time TEXT NOT NULL,
      notes TEXT,
      traffic_limit INTEGER,
      traffic_used INTEGER DEFAULT 0,
      ip_limit INTEGER DEFAULT -1
    )`,
    `CREATE TABLE IF NOT EXISTS user_ips (
      uuid TEXT,
      ip TEXT,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (uuid, ip)
    )`,
    `CREATE TABLE IF NOT EXISTS proxy_health (
      ip_port TEXT PRIMARY KEY,
      is_healthy INTEGER NOT NULL,
      latency_ms INTEGER,
      last_check INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS admin_session (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at INTEGER
    )`
  ];
  try {
    const stmts = create.map(s => env.DB.prepare(s));
    await env.DB.batch(stmts);
  } catch (e) {
    console.warn('ensureTablesExist failed', e);
  }
}

// Admin panel - render login or panel
app.get('/admin', async (c: any) => {
  await ensureTablesInitialized(c.env);
  const allowed = await isAdminRequest(c as any);
  const adminBase = '/admin';
  const headers = new Headers({ 'Content-Type': 'text/html;charset=utf-8' });
  addSecurityHeaders(headers);
  if (!allowed) {
    const { renderAdminLogin } = await getRenderFuncs();
    return new Response(renderAdminLogin(adminBase + '/login'), { headers });
  }
  const { renderAdminPanel } = await getRenderFuncs();
  return new Response(renderAdminPanel(), { headers });
});

// Admin API routes
app.get('/admin/api/stats', async (c: any) => {
  if (!(await isAdminRequest(c as any))) return c.json({ error: 'Forbidden' }, 403);
  const env = c.env;
  await ensureTablesInitialized(env);
  try {
    const total = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first('count');
    const expiredRow = await env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE datetime(expiration_date || 'T' || expiration_time || 'Z') < datetime('now')").first('count');
    const totalTraffic = await env.DB.prepare('SELECT SUM(traffic_used) as sum FROM users').first('sum');
    const expired = expiredRow || 0;
    const active = (total || 0) - expired;
    return c.json({ total_users: total || 0, active_users: active, expired_users: expired, total_traffic: totalTraffic || 0 });
  } catch (e: any) { const msg = e instanceof Error ? e.message : String(e); return c.json({ error: msg }, 500); }
});

app.get('/admin/api/users', async (c: any) => {
  if (!(await isAdminRequest(c as any))) return c.json({ error: 'Forbidden' }, 403);
  const rows = await c.env.DB.prepare('SELECT uuid, created_at, expiration_date, expiration_time, notes, traffic_limit, traffic_used, ip_limit FROM users ORDER BY created_at DESC').all();
  return c.json(rows.results || []);
});

app.post('/admin/api/users', async (c: any) => {
  if (!(await isAdminRequest(c as any))) return c.json({ error: 'Forbidden' }, 403);
  const body = await c.req.json();
  const { uuid, exp_date, exp_time, notes, traffic_limit, ip_limit } = body;
  if (!uuid || !exp_date || !exp_time) return c.json({ error: 'Missing fields' }, 400);
  try {
    await c.env.DB.prepare('INSERT INTO users (uuid, expiration_date, expiration_time, notes, traffic_limit, ip_limit, traffic_used) VALUES (?, ?, ?, ?, ?, ?, 0)')
      .bind(uuid, exp_date, exp_time, notes || null, traffic_limit || null, ip_limit || -1).run();
    return c.json({ success: true, uuid }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 400);
  }
});

app.put('/admin/api/users/:uuid', async (c: any) => {
  if (!(await isAdminRequest(c as any))) return c.json({ error: 'Forbidden' }, 403);
  const uuid = c.req.param('uuid');
  const body = await c.req.json();
  const { exp_date, exp_time, notes, traffic_limit, ip_limit, reset_traffic } = body;
  if (!exp_date || !exp_time) return c.json({ error: 'Missing date/time' }, 400);
  try {
    let query = 'UPDATE users SET expiration_date = ?, expiration_time = ?, notes = ?, traffic_limit = ?, ip_limit = ?';
    if (reset_traffic) query += ', traffic_used = 0';
    query += ' WHERE uuid = ?';
    await c.env.DB.prepare(query).bind(exp_date, exp_time, notes || null, traffic_limit || null, ip_limit || -1, uuid).run();
    return c.json({ success: true, uuid });
  } catch (e) { const msg = e instanceof Error ? e.message : String(e); return c.json({ error: msg }, 400); }
});

app.delete('/admin/api/users/:uuid', async (c: any) => {
  if (!(await isAdminRequest(c as any))) return c.json({ error: 'Forbidden' }, 403);
  const uuid = c.req.param('uuid');
  try {
    await c.env.DB.prepare('DELETE FROM users WHERE uuid = ?').bind(uuid).run();
    return c.json({ success: true, uuid });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

app.post('/admin/api/health-check', async (c: any) => {
  if (!(await isAdminRequest(c as any))) return c.json({ error: 'Forbidden' }, 403);
  const env = c.env;
  const proxyIps = env.PROXYIPS ? env.PROXYIPS.split(',').map((s: string) => s.trim()) : ['speed.cloudflare.com:443'];
  const stmts: any[] = [];
  for (const ipPort of proxyIps) {
    const [host, port='443'] = ipPort.split(':');
    let latency = null;
    let healthy = 0;
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(()=>controller.abort(), 5000);
      const r = await fetch(`https://${host}:${port}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (r.ok) { latency = Date.now() - start; healthy = 1; }
    } catch (e) { /* ignore */ }
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO proxy_health (ip_port, is_healthy, latency_ms, last_check) VALUES (?, ?, ?, ?)').bind(ipPort, healthy, latency, Math.floor(Date.now()/1000)));
  }
  try { await env.DB.batch(stmts); return c.json({ success: true }); } catch (e) { return c.json({ error: (e as any)?.message || String(e) }, 500); }
});

app.post('/admin/logout', async (c: any) => {
  // clear admin session
  try { await c.env.DB.prepare('DELETE FROM admin_session WHERE id = ?').bind('default').run(); } catch (e) {}
  const headers = new Headers();
  headers.append('Set-Cookie', 'auth_token=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict');
  addSecurityHeaders(headers);
  return new Response(JSON.stringify({ success: true }), { headers });
});

// API: get user stats for HTMX polling
app.get('/api/user/:uuid/stats', async (c: any) => {
  const { uuid } = c.req.param();
  const env = c.env;
  if (!/^[0-9a-fA-F-]{36}$/.test(uuid)) return c.json({ error: 'invalid' }, 400);
  const row = await env.DB.prepare('SELECT traffic_used, traffic_limit, expiration_date, expiration_time FROM users WHERE uuid = ?')
    .bind(uuid).first();
  if (!row) return c.json({ error: 'not found' }, 404);
  const iso = expiryToISO(row.expiration_date, row.expiration_time);
  return c.json({
    traffic_used: row.traffic_used || 0,
    traffic_limit: row.traffic_limit || null,
    expiration_iso: iso,
  });
});

// User panel page
app.get('/:uuid', async (c: any) => {
  const uuid = c.req.param('uuid');
  const env = c.env;
  if (!/^[0-9a-fA-F-]{36}$/.test(uuid)) return c.text('Invalid UUID', 400);
  const row = await env.DB.prepare('SELECT * FROM users WHERE uuid = ?').bind(uuid).first();
  if (!row) return c.text('Authentication failed', 403);
  // Compose subscription URLs using healthy proxy from D1 table if present
  let proxyIp = env.PROXYIPS ? env.PROXYIPS.split(',')[0] : 'speed.cloudflare.com:443';
  try {
    const best = await env.DB.prepare("SELECT ip_port FROM proxy_health WHERE is_healthy = 1 ORDER BY latency_ms ASC LIMIT 1").first();
    if (best?.ip_port) proxyIp = best.ip_port;
  } catch (e) { /* ignore */ }

  const host = c.req.headers.get('Host') || 'example.com';
  const subXray = `https://${host}/xray/${uuid}`;
  const subSb = `https://${host}/sb/${uuid}`;

  const expiration_iso = expiryToISO(row.expiration_date, row.expiration_time);

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>User Panel</title><script src="https://unpkg.com/htmx.org@1.9.2"></script><script src="https://unpkg.com/alpinejs@3.x.x" defer></script></head><body>
  <h1>User Panel</h1>
  <div>
    <p>UUID: <code>${uuid}</code></p>
    <p>Proxy: ${proxyIp}</p>
    <p>Subscription (Xray): <a href="${subXray}">${subXray}</a></p>
    <p>Subscription (Singbox): <a href="${subSb}">${subSb}</a></p>
    <div hx-get="/api/user/${uuid}/stats" hx-trigger="every 5s" hx-swap="outerHTML" id="stats-area">
      <p>Data used: ${row.traffic_used || 0} Bytes</p>
      <p>Expiry (UTC): ${expiration_iso || 'Unlimited'}</p>
    </div>
  </div>
  </body></html>`;

  const headers = new Headers({ 'Content-Type': 'text/html;charset=utf-8' });
  addSecurityHeaders(headers);
  return new Response(html, { headers });
});

// Subscription endpoints (xray/sb)
app.get('/xray/:uuid', async (c: any) => {
  const uuid = c.req.param('uuid');
  if (!/^[0-9a-fA-F-]{36}$/.test(uuid)) return c.text('Invalid UUID', 400);
  // simple subscription generation
  const host = c.req.headers.get('Host') || 'example.com';
  const links = [`vless://${uuid}@${host}:443?type=ws&host=${host}&path=/ws#xray`];
  const b = new Headers({ 'Content-Type': 'text/plain;charset=utf-8' });
  addSecurityHeaders(b);
  return new Response(btoa(links.join('\n')), { headers: b });
});

app.get('/sb/:uuid', async (c: any) => {
  const uuid = c.req.param('uuid');
  if (!/^[0-9a-fA-F-]{36}$/.test(uuid)) return c.text('Invalid UUID', 400);
  const host = c.req.headers.get('Host') || 'example.com';
  const links = [`vless://${uuid}@${host}:443?type=ws&host=${host}&path=/ws#singbox`];
  const b = new Headers({ 'Content-Type': 'text/plain;charset=utf-8' });
  addSecurityHeaders(b);
  return new Response(btoa(links.join('\n')), { headers: b });
});

// VLESS WebSocket handler at /ws
app.all('/ws', async (c: any) => {
  const req = c.req;
  const env = c.env;
  if (req.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
    return c.text('Must upgrade to WebSocket', 400);
  }

  // Initialize wasm if bound via env
  try {
    // Pass the WASM binding (vless_parser) from Cloudflare to wasm module
    if (env.vless_parser) {
      try { 
        const { initWasm } = await getWasmFuncs();
        await initWasm(env.vless_parser);
      } catch (e) { console.warn('WASM init failed', e); }
    }
  } catch (e) { console.warn('wasm init skipped', e); }

  // @ts-ignore: WebSocketPair is a global in Cloudflare Workers
    const webSocketPair = new (globalThis as any).WebSocketPair();
    const [client, server] = Object.values(webSocketPair) as [WebSocket, WebSocket];
    (server as any).accept();

  // session usage tracking
  let sessionUsage = 0;
  let uuidStr = '';

  const flushUsage = async () => {
    try {
      if (!uuidStr || sessionUsage <= 0) return;
      // flush to D1 using ctx.waitUntil to avoid blocking
      c.executionCtx.waitUntil((async () => {
        try {
          await env.DB.prepare('UPDATE users SET traffic_used = traffic_used + ? WHERE uuid = ?')
            .bind(Math.round(sessionUsage), uuidStr).run();
        } catch (e) { console.error('flush usage error', e); }
      })());
      sessionUsage = 0;
    } catch (e) { console.error('flushUsage outer', e); }
  };

  const intervalId = setInterval(() => { flushUsage(); }, 10000);

  server.addEventListener('message', async (evt: MessageEvent) => {
    try {
      const data = evt.data;
      let chunk: Uint8Array;
      if (typeof data === 'string') {
        chunk = new TextEncoder().encode(data);
      } else if (data instanceof ArrayBuffer) {
        chunk = new Uint8Array(data);
      } else if (data instanceof Blob) {
        chunk = new Uint8Array(await data.arrayBuffer());
      } else {
        return;
      }
      sessionUsage += chunk.byteLength;

      // For the first chunk, parse header
      if (!uuidStr) {
        try {
          // ensure we have enough bytes; otherwise wait for more (simple approach)
          if (chunk.byteLength < 24) {
            // buffer until next message arrives (not implemented fully here)
          }
          // prefer wasm parser
          let parsed: any = null;
          try {
            const { parseVlessHeader } = await getWasmFuncs();
            parsed = await parseVlessHeader(chunk);
          } catch (err) {
            console.warn('WASM parse failed, falling back to JS parser', err);
          }
          if (!parsed) {
            // fallback simple parse (compatible with earlier JS logic)
            // We will attempt to reuse the first 24 bytes
            const view = new DataView(chunk.buffer);
            const uuidBytes = new Uint8Array(chunk.buffer.slice(1, 17));
            const uuidParts = Array.from(uuidBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            const uuidFmt = uuidParts.substring(0,8) + '-' + uuidParts.substring(8,12) + '-' + uuidParts.substring(12,16) + '-' + uuidParts.substring(16,20) + '-' + uuidParts.substring(20,32);
            parsed = { uuid: uuidFmt, command: view.getUint8(18), address: '', address_type: 1, port: 443 };
          }

          uuidStr = parsed.uuid;

          // Validate user exists and not expired
          const userRow = await env.DB.prepare('SELECT uuid, traffic_limit, traffic_used, expiration_date, expiration_time, ip_limit FROM users WHERE uuid = ?')
            .bind(uuidStr).first();
          if (!userRow) {
            server.close(1011, 'Authentication failed');
            return;
          }

          const expIso = expiryToISO(userRow.expiration_date, userRow.expiration_time);
          if (expIso && new Date(expIso) <= new Date()) {
            server.close(1008, 'Expired');
            return;
          }

          if (userRow.traffic_limit && userRow.traffic_limit > 0 && (userRow.traffic_used || 0) >= userRow.traffic_limit) {
            server.close(1008, 'Traffic limit exceeded');
            return;
          }

          // IP limit check
          try {
            const clientIp = req.headers.get('CF-Connecting-IP') || req.headers.get('x-forwarded-for') || '';
            if (userRow.ip_limit && userRow.ip_limit > -1) {
              const ipCountRes = await env.DB.prepare('SELECT COUNT(DISTINCT ip) as count FROM user_ips WHERE uuid = ?').bind(uuidStr).first();
              const ipCount = ipCountRes?.count || 0;
              if (ipCount >= userRow.ip_limit) {
                server.close(1008, 'IP limit exceeded');
                return;
              }
            }
            // upsert user_ip
            c.executionCtx.waitUntil((async () => {
              try {
                await env.DB.prepare('INSERT OR REPLACE INTO user_ips (uuid, ip, last_seen) VALUES (?, ?, CURRENT_TIMESTAMP)')
                  .bind(uuidStr, req.headers.get('CF-Connecting-IP') || 'unknown').run();
              } catch (e) { console.warn('user_ip upsert failed', e); }
            })());
          } catch (e) { console.warn('ip_limit check err', e); }
        } catch (e) {
          console.error('initial header parse error', e);
          server.close(1011, 'Parse error');
          return;
        }
      }

      // Echo behaviour for now: forward to proxy or handle TCP connect using cloudflare sockets
      // For safety in worker environment, we simply respond with OK for this minimal port
      // TODO: integrate full remote socket connect using cloudflare:sockets binding
      // For now, reply with a small message acknowledging bytes received
      try {
        if (server.readyState === 1) {
          server.send('ACK');
        }
      } catch (e) { console.warn('send ack failed', e); }
    } catch (err) {
      console.error('message handler error', err);
      try { server.close(1011, 'Internal error'); } catch (e) {}
    }
  });

  server.addEventListener('close', async () => {
    clearInterval(intervalId);
    try { await flushUsage(); } catch (e) { console.warn('flush on close failed', e); }
  });

  const headers = new Headers();
  addSecurityHeaders(headers);
  const resInit: any = { status: 101, webSocket: client, headers };
  return new Response(null, resInit);
});

// Static fallback (simple placeholder)
  app.get('/static/*', async (c) => {
    return c.text('Static assets are not served from this build.');
  });

}

export { expiryToISO };

export default {
  fetch: async (request: Request, env: any, ctx: any) => {
    await initializeApp();
    return appInstance.fetch(request as any, env, ctx);
  }
};

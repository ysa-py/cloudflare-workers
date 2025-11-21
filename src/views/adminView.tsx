export function renderAdminLogin(actionPath: string, errorMessage?: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin Login</title>
  <style>
    :root{--bg:#ffffff;--accent:#333;--muted:#666;--btn:#4a90e2}
    html,body{height:100%;margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial}
    body{display:flex;align-items:flex-start;justify-content:center;background:var(--bg);padding:24px}
    .card{max-width:520px;width:100%;margin-top:24px}
    h1{font-size:2.4rem;margin:8px 0;color:var(--accent)}
    form{display:flex;gap:8px;flex-wrap:wrap}
    input[type="password"]{flex:1 1 240px;padding:10px 12px;font-size:1rem;border:1px solid #bbb;border-radius:4px}
    button{padding:8px 12px;font-size:1rem;border-radius:4px;border:1px solid rgba(0,0,0,0.1);background:var(--btn);color:white}
    p.error{color:#b00020;margin-top:8px}
    @media (max-width:420px){body{padding:12px}h1{font-size:1.8rem}input,button{font-size:1rem}}
  </style>
  </head><body>
  <main class="card" role="main">
  <h1>Admin Login</h1>
  <form method="POST" action="${actionPath}" aria-label="Admin login form">
    <label for="admin-password" class="sr-only" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;">Password</label>
    <input id="admin-password" name="password" type="password" placeholder="password" required aria-required="true" autocomplete="current-password" />
    <button type="submit" aria-label="Submit admin password">Login</button>
  </form>
  ${errorMessage ? `<p class="error">${escapeHtml(errorMessage)}</p>` : ''}
  </main>
</body></html>`;
}

export function renderAdminPanel() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin Panel</title>
  <style>
    html,body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial}
    body{padding:20px}
    h1{font-size:2rem}
  </style>
  </head><body>
  <h1>Admin Dashboard</h1>
  <div>
    <p>Manage users and perform health checks from this panel.</p>
  </div>
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'} as any)[c]);
}

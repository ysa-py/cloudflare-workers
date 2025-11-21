export function renderAdminLogin(actionPath: string, errorMessage?: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin Login</title></head><body>
  <h1>Admin Login</h1>
  <form method="POST" action="${actionPath}">
    <input name="password" type="password" placeholder="password" required />
    <button type="submit">Login</button>
  </form>
  ${errorMessage ? `<p style="color:red">${escapeHtml(errorMessage)}</p>` : ''}
</body></html>`;
}

export function renderAdminPanel() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin Panel</title></head><body>
  <h1>Admin Dashboard</h1>
  <div>
    <p>Manage users and perform health checks from this panel.</p>
  </div>
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'} as any)[c]);
}

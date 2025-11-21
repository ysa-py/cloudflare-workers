export function renderUserPanel(opts: { uuid: string; proxyIp: string; subXray: string; subSb: string; expirationIso: string | null; trafficUsed: number; trafficLimit: number | null; notes?: string }) {
  const { uuid, proxyIp, subXray, subSb, expirationIso, trafficUsed, trafficLimit, notes } = opts;
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>User Panel</title>
<script src="https://unpkg.com/htmx.org@1.9.2"></script>
<script src="https://unpkg.com/alpinejs@3.x.x" defer></script>
</head><body>
<div class="container">
  <h1>User Panel</h1>
  <div>
    <p><strong>UUID:</strong> <code>${uuid}</code></p>
    <p><strong>Proxy:</strong> ${proxyIp}</p>
    <p><strong>Xray Subscribe:</strong> <a href="${subXray}">${subXray}</a></p>
    <p><strong>Singbox Subscribe:</strong> <a href="${subSb}">${subSb}</a></p>
    <div id="stats" hx-get="/api/user/${uuid}/stats" hx-trigger="load, every 5s" hx-swap="outerHTML">
      <p>Data used: ${trafficUsed} Bytes</p>
      <p>Expiry (UTC): ${expirationIso || 'Unlimited'}</p>
    </div>
    ${notes ? `<p><strong>Notes:</strong> ${escapeHtml(notes)}</p>` : ''}
  </div>
</div>
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'} as any)[c]);
}

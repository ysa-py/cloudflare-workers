// Minimal bootstrap entry: defers heavy app initialization to first request
// This keeps startup CPU low for Cloudflare Workers validation.

export default {
  async fetch(request: Request, env: any, ctx: any) {
    // Import the actual app on first request (lazy load)
    const { default: mainWorker } = await import('./index');
    return mainWorker.fetch(request, env, ctx);
  }
};

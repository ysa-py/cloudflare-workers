// Absolute minimal entry point with truly deferred initialization
// NO module-level code runs on startup - everything deferred to first request

let cachedWorker: any = null;

export default {
  async fetch(request: Request, env: any, ctx: any) {
    // Load worker on first request only
    if (!cachedWorker) {
      cachedWorker = (await import('./index')).default;
    }
    return cachedWorker.fetch(request, env, ctx);
  }
};

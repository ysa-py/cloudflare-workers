// src/entry.ts
var cachedWorker = null;
var entry_default = {
  async fetch(request, env, ctx) {
    if (!cachedWorker) {
      cachedWorker = (await import("./-WHF5ACYN.js")).default;
    }
    return cachedWorker.fetch(request, env, ctx);
  }
};
export {
  entry_default as default
};

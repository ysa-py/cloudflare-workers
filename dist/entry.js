import "./chunk-6C3VEZWH.js";

// src/entry.ts
var cachedWorker = null;
var entry_default = {
  async fetch(request, env, ctx) {
    if (!cachedWorker) {
      cachedWorker = (await import("./-Q6XFISL7.js")).default;
    }
    return cachedWorker.fetch(request, env, ctx);
  }
};
export {
  entry_default as default
};

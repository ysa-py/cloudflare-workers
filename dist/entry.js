// src/entry.ts
var entry_default = {
  async fetch(request, env, ctx) {
    const { default: mainWorker } = await import("./-6SN5IBB2.js");
    return mainWorker.fetch(request, env, ctx);
  }
};
export {
  entry_default as default
};

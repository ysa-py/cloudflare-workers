import "./chunk-6C3VEZWH.js";

// src/wasm/wasm.ts
var wasmReady = false;
var wasmModule = null;
async function initWasm(gluePath) {
  if (wasmReady)
    return wasmModule;
  try {
    const path = gluePath || "./rust/pkg/vless_parser.js";
    const mod = await import(path);
    if (typeof mod.default === "function") {
      await mod.default();
    }
    wasmModule = mod;
    wasmReady = true;
    return wasmModule;
  } catch (err) {
    console.warn("WASM module not available at runtime:", err);
    wasmReady = false;
    throw err;
  }
}
async function parseVlessHeader(buffer) {
  if (!wasmReady) {
    throw new Error("WASM not initialized. Call initWasm() first.");
  }
  if (!wasmModule || typeof wasmModule.parse_vless_header !== "function") {
    throw new Error("parse_vless_header not available on wasm module");
  }
  return await wasmModule.parse_vless_header(buffer);
}
export {
  initWasm,
  parseVlessHeader
};

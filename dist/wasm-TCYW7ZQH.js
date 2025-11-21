// src/wasm/wasm.ts
var wasmReady = false;
var wasmModule = null;
async function initWasm(wasmBinding) {
  if (wasmReady)
    return wasmModule;
  try {
    if (wasmBinding) {
      wasmModule = wasmBinding;
      wasmReady = true;
      return wasmModule;
    }
    console.debug("WASM binding not provided, attempting dynamic import");
    const mod = await import("./rust/pkg/vless_parser.js");
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

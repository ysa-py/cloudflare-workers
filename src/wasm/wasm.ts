// Lightweight wrapper expecting wasm-bindgen generated package to be available
// during build at `./rust/pkg/vless_parser.js`. This module provides
// `init()` and `parse_vless_header` exported by wasm-bindgen.

let wasmReady = false;
let wasmModule: any = null;

export async function initWasm(gluePath?: string) {
  if (wasmReady) return wasmModule;
  try {
    // try dynamic import of generated wasm-bindgen glue
    const path = gluePath || './rust/pkg/vless_parser.js';
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const mod = await import(path);
    if (typeof mod.default === 'function') {
      await mod.default();
    }
    wasmModule = mod;
    wasmReady = true;
    return wasmModule;
  } catch (err) {
    console.warn('WASM module not available at runtime:', err);
    wasmReady = false;
    throw err;
  }
}

export async function parseVlessHeader(buffer: Uint8Array) {
  if (!wasmReady) {
    throw new Error('WASM not initialized. Call initWasm() first.');
  }
  if (!wasmModule || typeof wasmModule.parse_vless_header !== 'function') {
    throw new Error('parse_vless_header not available on wasm module');
  }
  return await wasmModule.parse_vless_header(buffer);
}

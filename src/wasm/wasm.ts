// WASM module loader - uses Cloudflare's native WASM binding
// Dynamically loads from vless_parser binding provided by wrangler.toml

let wasmReady = false;
let wasmModule: any = null;

export async function initWasm(wasmBinding?: any) {
  if (wasmReady) return wasmModule;
  try {
    // For Cloudflare Workers, the WASM is provided as a binding
    // in the environment via wrangler.toml wasm_modules configuration.
    // We'll lazily initialize it when first called.
    if (wasmBinding) {
      wasmModule = wasmBinding;
      wasmReady = true;
      return wasmModule;
    }
    
    // Fallback: try dynamic import (for local testing)
    console.debug('WASM binding not provided, attempting dynamic import');
    const mod = await import('./rust/pkg/vless_parser.js');
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

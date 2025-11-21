declare module 'drizzle-orm';
declare module 'drizzle-orm/sqlite-core';
declare module 'htmx.org';
declare module 'cloudflare:sockets';
declare module 'wasm-bindgen';

interface D1Database {
  prepare(query: string): any;
  batch(stmts: any[]): Promise<any>;
}

declare const crypto: any;

declare module 'hono/jsx-runtime';

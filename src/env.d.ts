/// <reference types="astro/client" />

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    user: import('./types/academy-db').UserRecord | null;
    session: import('./types/academy-db').SessionRecord | null;
  }
}

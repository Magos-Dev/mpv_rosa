import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Todas as páginas são dinâmicas (dependem de sessão/banco): não há ISR,
// então não é necessário cache incremental (R2/KV).
export default defineCloudflareConfig({});

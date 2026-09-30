// Build para Cloudflare SEM embutir segredos no Worker.
//
// O OpenNext copia para o código do Worker as variáveis de todos os
// arquivos .env que o Next carrega. Por isso o .env.local (que contém a
// service role e a senha dos usuários de teste) é escondido durante o
// build e só as variáveis PÚBLICAS são passadas. Os segredos de runtime
// ficam no cofre da Cloudflare: npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
//
// Uso: npm run cf:build   (ou npm run deploy)

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, renameSync } from "node:fs";

const PUBLIC_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
];
const ENV_FILES = [".env", ".env.local", ".env.production", ".env.production.local"];
const HIDDEN_SUFFIX = ".cf-build-hidden";

function parseEnv(path) {
  const vars = {};
  if (!existsSync(path)) return vars;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return vars;
}

// Variáveis públicas declaradas em "vars" do wrangler.jsonc (fonte única do deploy)
function wranglerVars() {
  if (!existsSync("wrangler.jsonc")) return {};
  const text = readFileSync("wrangler.jsonc", "utf8");
  const block = text.match(/"vars"\s*:\s*\{([^}]*)\}/);
  const vars = {};
  for (const m of block?.[1].matchAll(/"([A-Z0-9_]+)"\s*:\s*"([^"]*)"/g) ?? []) vars[m[1]] = m[2];
  return vars;
}

// Coleta só as variáveis públicas (ambiente atual > wrangler.jsonc > arquivos .env)
const fromFiles = Object.assign({}, ...ENV_FILES.map(parseEnv), wranglerVars());
const publicEnv = {};
for (const name of PUBLIC_VARS) {
  const value = process.env[name] || fromFiles[name];
  if (value) publicEnv[name] = value;
}
for (const required of PUBLIC_VARS.slice(0, 2)) {
  if (!publicEnv[required]) {
    console.error(`Variável obrigatória ausente: ${required}`);
    process.exit(1);
  }
}
if (!publicEnv.NEXT_PUBLIC_SITE_URL) {
  console.warn("Aviso: NEXT_PUBLIC_SITE_URL não definida (QR Code usará o domínio acessado).");
}

// Esconde os arquivos .env e garante a restauração
const hidden = [];
function restore() {
  for (const file of hidden.splice(0)) {
    if (existsSync(file + HIDDEN_SUFFIX)) renameSync(file + HIDDEN_SUFFIX, file);
  }
}
process.on("exit", restore);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    restore();
    process.exit(1);
  });
}

// Recupera arquivos deixados escondidos por uma execução interrompida
for (const file of ENV_FILES) {
  if (existsSync(file + HIDDEN_SUFFIX) && !existsSync(file)) renameSync(file + HIDDEN_SUFFIX, file);
}

for (const file of ENV_FILES) {
  if (existsSync(file)) {
    renameSync(file, file + HIDDEN_SUFFIX);
    hidden.push(file);
  }
}

// Ambiente mínimo: sem herdar segredos do shell
const env = {
  PATH: process.env.PATH,
  PATHEXT: process.env.PATHEXT,
  SystemRoot: process.env.SystemRoot,
  TEMP: process.env.TEMP,
  TMP: process.env.TMP,
  HOME: process.env.HOME,
  USERPROFILE: process.env.USERPROFILE,
  APPDATA: process.env.APPDATA,
  LOCALAPPDATA: process.env.LOCALAPPDATA,
  NEXT_TELEMETRY_DISABLED: "1",
  ...publicEnv,
};

const result = spawnSync("npx", ["opennextjs-cloudflare", "build"], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});
restore();
process.exit(result.status ?? 1);

// Cria (ou atualiza) um usuário de teste para cada perfil.
// Uso: npm run seed:users
// Requer em .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_USERS_PASSWORD
// Execute apenas em ambiente de desenvolvimento.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_USERS_PASSWORD;

if (!url || !serviceRoleKey || !password) {
  console.error(
    "Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SEED_USERS_PASSWORD em .env.local",
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("SEED_USERS_PASSWORD deve ter pelo menos 8 caracteres.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: "admin@rosaerose.local", name: "Administrador", role: "admin" },
  { email: "operador@rosaerose.local", name: "Operador", role: "operator" },
  { email: "motoboy@rosaerose.local", name: "João Motoboy", role: "courier" },
];

async function findUserByEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
}

for (const user of users) {
  const existing = await findUserByEmail(user.email);
  let userId;

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      app_metadata: { role: user.role },
      user_metadata: { name: user.name },
    });
    if (error) throw error;
    userId = existing.id;
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
      app_metadata: { role: user.role },
      user_metadata: { name: user.name },
    });
    if (error) throw error;
    userId = created.user.id;
  }

  // O Auth grava app_metadata depois do INSERT, então o trigger cria o
  // profile com o padrão seguro (inativo). Define o papel explicitamente.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: user.role, name: user.name, active: true })
    .eq("id", userId);
  if (profileError) throw profileError;

  // Motoboy precisa também do cadastro em couriers (Etapa 5)
  if (user.role === "courier") {
    const { error: courierError } = await supabase
      .from("couriers")
      .upsert({ user_id: userId, name: user.name, active: true }, { onConflict: "user_id" });
    if (courierError) throw courierError;
  }

  console.log(`✔ ${existing ? "atualizado" : "criado"}: ${user.email} (${user.role})`);
}

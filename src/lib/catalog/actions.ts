"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/session";
import { isMenuImageUrl, MENU_IMAGES_BUCKET, storagePathFromUrl } from "@/lib/catalog/images";
import {
  categorySchema,
  optionGroupsSchema,
  productSchema,
  type CategoryInput,
  type OptionGroupsInput,
  type ProductInput,
} from "@/lib/catalog/schemas";
import { uniqueSlug, slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Direction = "up" | "down";

// ---------------------------------------------------------------------
// Infra
// ---------------------------------------------------------------------

/** Toda action do cardápio exige admin ativo (o RLS também bloqueia). */
async function adminClient(): Promise<Supabase | null> {
  const profile = await getCurrentProfile();
  if (!profile?.active || profile.role !== "admin") return null;
  return createClient();
}

const DENIED = { ok: false, error: "Você não tem permissão para esta ação." } as const;

function invalid(error: z.ZodError): { ok: false; error: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, error: "Verifique os campos destacados.", fieldErrors };
}

function dbError(context: string, error: { code?: string; message: string }) {
  console.error(`[catalog] ${context}:`, error.code, error.message);
  if (error.code === "23505") return { ok: false as const, error: "Já existe um registro com esse nome." };
  if (error.code === "23503") {
    return { ok: false as const, error: "Não é possível excluir: existem itens vinculados." };
  }
  if (error.code === "42501") return DENIED;
  return { ok: false as const, error: "Não foi possível salvar. Tente novamente." };
}

function checkImage(url: string | null) {
  return url === null || isMenuImageUrl(url);
}

/** Remove do Storage uma imagem que deixou de ser usada (melhor esforço). */
async function removeImage(supabase: Supabase, url: string | null | undefined) {
  const path = url ? storagePathFromUrl(url) : null;
  if (!path) return;
  const { error } = await supabase.storage.from(MENU_IMAGES_BUCKET).remove([path]);
  if (error) console.warn("[catalog] falha ao remover imagem antiga:", error.message);
}

function revalidateMenu() {
  revalidatePath("/admin/categorias");
  revalidatePath("/admin/produtos");
  revalidatePath("/cardapio");
  revalidatePath("/produto/[slug]", "page");
}

async function takenSlugs(supabase: Supabase, table: "categories" | "products", base: string) {
  const { data } = await supabase.from(table).select("slug").like("slug", `${slugify(base)}%`);
  return (data ?? []).map((r) => r.slug);
}

/**
 * Move um item uma posição para cima/baixo, renumerando a lista inteira
 * (corrige empates de sort_order).
 */
async function reorder(
  supabase: Supabase,
  table: "categories" | "products",
  items: { id: string; sort_order: number }[],
  id: string,
  direction: Direction,
): Promise<ActionResult> {
  const index = items.findIndex((i) => i.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0) return { ok: false, error: "Item não encontrado." };
  if (target < 0 || target >= items.length) return { ok: true };

  const ordered = [...items];
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

  const changes = ordered
    .map((item, position) => ({ id: item.id, from: item.sort_order, to: position }))
    .filter((c) => c.from !== c.to);

  for (const change of changes) {
    const { error } = await supabase.from(table).update({ sort_order: change.to }).eq("id", change.id);
    if (error) return dbError("reordenar", error);
  }

  revalidateMenu();
  return { ok: true };
}

// =====================================================================
// Categorias
// =====================================================================

export async function createCategory(input: CategoryInput): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!checkImage(parsed.data.image_url)) return { ok: false, error: "Imagem inválida." };

  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const slug = uniqueSlug(parsed.data.name, await takenSlugs(supabase, "categories", parsed.data.name));
  const { error } = await supabase
    .from("categories")
    .insert({ ...parsed.data, slug, sort_order: (last?.sort_order ?? -1) + 1 });

  if (error) return dbError("criar categoria", error);
  revalidateMenu();
  return { ok: true };
}

export async function updateCategory(id: string, input: CategoryInput): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!checkImage(parsed.data.image_url)) return { ok: false, error: "Imagem inválida." };

  const { data: current } = await supabase.from("categories").select("image_url").eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "Categoria não encontrada." };

  // O slug é mantido para não quebrar links já divulgados
  const { error } = await supabase.from("categories").update(parsed.data).eq("id", id);
  if (error) return dbError("atualizar categoria", error);

  if (current.image_url !== parsed.data.image_url) await removeImage(supabase, current.image_url);
  revalidateMenu();
  return { ok: true };
}

export async function setCategoryActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;

  const { error } = await supabase.from("categories").update({ active }).eq("id", id);
  if (error) return dbError("ativar/desativar categoria", error);
  revalidateMenu();
  return { ok: true };
}

export async function moveCategory(id: string, direction: Direction): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;

  const { data, error } = await supabase
    .from("categories")
    .select("id, sort_order")
    .order("sort_order")
    .order("name");
  if (error) return dbError("reordenar categorias", error);

  return reorder(supabase, "categories", data, id, direction);
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (count && count > 0) {
    return {
      ok: false,
      error: "Esta categoria possui produtos (inclusive arquivados). Desative-a em vez de excluir.",
    };
  }

  const { data: removed, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .select("image_url")
    .maybeSingle();
  if (error) return dbError("excluir categoria", error);

  await removeImage(supabase, removed?.image_url);
  revalidateMenu();
  return { ok: true };
}

// =====================================================================
// Produtos
// =====================================================================

async function nextProductOrder(supabase: Supabase, categoryId: string) {
  const { data } = await supabase
    .from("products")
    .select("sort_order")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? -1) + 1;
}

export async function createProduct(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!checkImage(parsed.data.image_url)) return { ok: false, error: "Imagem inválida." };

  const slug = uniqueSlug(parsed.data.name, await takenSlugs(supabase, "products", parsed.data.name));
  const { data, error } = await supabase
    .from("products")
    .insert({
      ...parsed.data,
      slug,
      sort_order: await nextProductOrder(supabase, parsed.data.category_id),
    })
    .select("id")
    .single();

  if (error) return dbError("criar produto", error);
  revalidateMenu();
  return { ok: true, data: { id: data.id } };
}

export async function updateProduct(id: string, input: ProductInput): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!checkImage(parsed.data.image_url)) return { ok: false, error: "Imagem inválida." };

  const { data: current } = await supabase
    .from("products")
    .select("image_url, category_id")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { ok: false, error: "Produto não encontrado." };

  const changedCategory = current.category_id !== parsed.data.category_id;
  const { error } = await supabase
    .from("products")
    .update({
      ...parsed.data,
      // Ao trocar de categoria, entra no fim da nova lista
      ...(changedCategory && {
        sort_order: await nextProductOrder(supabase, parsed.data.category_id),
      }),
    })
    .eq("id", id);
  if (error) return dbError("atualizar produto", error);

  if (current.image_url !== parsed.data.image_url) await removeImage(supabase, current.image_url);
  revalidateMenu();
  return { ok: true };
}

export async function setProductAvailable(id: string, available: boolean): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;

  const { error } = await supabase.from("products").update({ available }).eq("id", id);
  if (error) return dbError("alterar disponibilidade", error);
  revalidateMenu();
  return { ok: true };
}

/** Arquivar (active=false) ou reativar. Produtos nunca são apagados. */
export async function setProductActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;

  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) return dbError("arquivar produto", error);
  revalidateMenu();
  return { ok: true };
}

export async function moveProduct(id: string, direction: Direction): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;

  const { data: product } = await supabase
    .from("products")
    .select("category_id")
    .eq("id", id)
    .maybeSingle();
  if (!product) return { ok: false, error: "Produto não encontrado." };

  const { data, error } = await supabase
    .from("products")
    .select("id, sort_order")
    .eq("category_id", product.category_id)
    .eq("active", true)
    .order("sort_order")
    .order("name");
  if (error) return dbError("reordenar produtos", error);

  return reorder(supabase, "products", data, id, direction);
}

// =====================================================================
// Grupos de opções (adicionais)
// =====================================================================

export async function saveOptionGroups(
  productId: string,
  input: OptionGroupsInput,
): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;

  const parsed = optionGroupsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  // Transação única no banco (cria/atualiza/remove tudo ou nada)
  const { error } = await supabase.rpc("save_product_option_groups", {
    p_product_id: productId,
    p_groups: parsed.data.groups,
  });
  if (error) return dbError("salvar adicionais", error);

  revalidateMenu();
  revalidatePath(`/admin/produtos/${productId}`);
  return { ok: true };
}

/** Grupos de outro produto, sem IDs, para copiar para o produto atual. */
export async function getOptionGroupsToCopy(
  sourceProductId: string,
): Promise<ActionResult<OptionGroupsInput["groups"]>> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;

  const { data, error } = await supabase
    .from("option_groups")
    .select("name, required, min_choices, max_choices, sort_order, product_options(name, additional_price, available, sort_order)")
    .eq("product_id", sourceProductId)
    .order("sort_order");
  if (error) return dbError("copiar adicionais", error);

  return {
    ok: true,
    data: data.map((g) => ({
      name: g.name,
      required: g.required,
      min_choices: g.min_choices,
      max_choices: g.max_choices,
      options: [...g.product_options]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((o) => ({ name: o.name, additional_price: o.additional_price, available: o.available })),
    })),
  };
}

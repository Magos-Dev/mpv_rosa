import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Category = Tables<"categories">;
export type Product = Tables<"products">;
export type OptionGroup = Tables<"option_groups">;
export type ProductOption = Tables<"product_options">;

export type CategoryWithCount = Category & { product_count: number };
export type ProductWithCategory = Product & { category: Pick<Category, "id" | "name"> | null };
export type OptionGroupWithOptions = OptionGroup & { options: ProductOption[] };
export type ProductDetail = Product & { option_groups: OptionGroupWithOptions[] };

function fail(context: string, message: string): never {
  console.error(`[catalog] ${context}:`, message);
  throw new Error(`Não foi possível carregar ${context}.`);
}

const byOrder = <T extends { sort_order: number; name: string }>(a: T, b: T) =>
  a.sort_order - b.sort_order || a.name.localeCompare(b.name, "pt-BR");

// =====================================================================
// Admin
// =====================================================================

export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*, products(count)")
    .order("sort_order")
    .order("name");

  if (error) fail("as categorias", error.message);

  return data.map(({ products, ...category }) => ({
    ...category,
    product_count: products[0]?.count ?? 0,
  }));
}

export async function listCategoryOptions(): Promise<Pick<Category, "id" | "name" | "active">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, active")
    .order("sort_order")
    .order("name");

  if (error) fail("as categorias", error.message);
  return data;
}

export type ProductStatusFilter = "ativos" | "esgotados" | "arquivados";

export async function listProducts(filters: {
  categoryId?: string;
  search?: string;
  status: ProductStatusFilter;
}): Promise<ProductWithCategory[]> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*, category:categories(id, name, sort_order)");

  if (filters.status === "arquivados") {
    query = query.eq("active", false);
  } else {
    query = query.eq("active", true);
    if (filters.status === "esgotados") query = query.eq("available", false);
  }
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.search) {
    // Escapa curingas do ILIKE digitados pelo usuário
    const term = filters.search.replace(/[\\%_]/g, (c) => `\\${c}`);
    query = query.ilike("name", `%${term}%`);
  }

  const { data, error } = await query;
  if (error) fail("os produtos", error.message);

  // Ordena pela ordem da categoria e depois pela ordem do produto
  return data
    .sort(
      (a, b) =>
        (a.category?.sort_order ?? 0) - (b.category?.sort_order ?? 0) ||
        (a.category?.name ?? "").localeCompare(b.category?.name ?? "", "pt-BR") ||
        byOrder(a, b),
    )
    .map(({ category, ...product }) => ({
      ...product,
      category: category ? { id: category.id, name: category.name } : null,
    }));
}

export async function getProductForEdit(id: string): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, option_groups(*, options:product_options(*))")
    .eq("id", id)
    .maybeSingle();

  if (error) fail("o produto", error.message);
  if (!data) return null;

  return {
    ...data,
    option_groups: data.option_groups
      .map((g) => ({ ...g, options: [...g.options].sort(byOrder) }))
      .sort(byOrder),
  };
}

/** Produtos que possuem adicionais (origem para "copiar de outro produto"). */
export async function listProductsWithOptionGroups(
  excludeId: string,
): Promise<{ id: string; name: string; group_count: number }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, option_groups!inner(id)")
    .neq("id", excludeId)
    .order("name");

  if (error) fail("os produtos", error.message);
  return data.map((p) => ({ id: p.id, name: p.name, group_count: p.option_groups.length }));
}

// =====================================================================
// Cardápio público — filtra "ativo" explicitamente, mesmo que um admin
// logado esteja navegando (RLS dele permitiria ver itens inativos).
// =====================================================================

export type PublicProduct = Pick<
  Product,
  | "id"
  | "name"
  | "slug"
  | "description"
  | "image_url"
  | "price"
  | "promotional_price"
  | "available"
  | "featured"
  | "best_seller"
  | "sort_order"
>;

export type PublicCategory = Pick<Category, "id" | "name" | "slug" | "description"> & {
  products: PublicProduct[];
};

const PUBLIC_PRODUCT_FIELDS =
  "id, name, slug, description, image_url, price, promotional_price, available, featured, best_seller, sort_order";

export const getPublicMenu = cache(async (): Promise<PublicCategory[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(`id, name, slug, description, products(${PUBLIC_PRODUCT_FIELDS})`)
    .eq("active", true)
    .eq("products.active", true)
    .order("sort_order")
    .order("name");

  if (error) fail("o cardápio", error.message);

  return data
    .map((category) => ({ ...category, products: [...category.products].sort(byOrder) }))
    .filter((c) => c.products.length > 0);
});

export type PublicProductDetail = PublicProduct & {
  category: Pick<Category, "name" | "slug">;
  option_groups: (Pick<OptionGroup, "id" | "name" | "required" | "min_choices" | "max_choices" | "sort_order"> & {
    options: Pick<ProductOption, "id" | "name" | "additional_price" | "available" | "sort_order">[];
  })[];
};

export const getPublicProduct = cache(async (slug: string): Promise<PublicProductDetail | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `${PUBLIC_PRODUCT_FIELDS},
       category:categories!inner(name, slug, active),
       option_groups(id, name, required, min_choices, max_choices, sort_order,
         options:product_options(id, name, additional_price, available, sort_order))`,
    )
    .eq("slug", slug)
    .eq("active", true)
    .eq("category.active", true)
    .maybeSingle();

  if (error) fail("o produto", error.message);
  if (!data) return null;

  const { category, option_groups, ...product } = data;
  return {
    ...product,
    category: { name: category.name, slug: category.slug },
    option_groups: option_groups
      .map((g) => ({ ...g, options: [...g.options].sort(byOrder) }))
      .sort(byOrder),
  };
});

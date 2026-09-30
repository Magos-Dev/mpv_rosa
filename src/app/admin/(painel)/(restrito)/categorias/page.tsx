import type { Metadata } from "next";

import { CategoryManager } from "@/components/catalog/category-manager";
import { listCategoriesWithCounts } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  const categories = await listCategoriesWithCounts();
  return <CategoryManager categories={categories} />;
}

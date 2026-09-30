import { publicEnv } from "@/lib/env";

export const MENU_IMAGES_BUCKET = "menu-images";
export const MENU_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MENU_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type MenuImageFolder = "products" | "categories";

function publicPrefix() {
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/${MENU_IMAGES_BUCKET}/`;
}

/** Aceita apenas URLs do nosso bucket (impede salvar links externos arbitrários). */
export function isMenuImageUrl(url: string): boolean {
  return url.startsWith(publicPrefix()) && !url.includes("..");
}

/** URL pública → caminho dentro do bucket ("products/abc.webp"). */
export function storagePathFromUrl(url: string): string | null {
  return isMenuImageUrl(url) ? url.slice(publicPrefix().length) : null;
}

export function validateMenuImageFile(file: File): string | null {
  if (!(MENU_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Formato não suportado. Use JPG, PNG ou WEBP.";
  }
  if (file.size > MENU_IMAGE_MAX_BYTES) {
    return "A imagem deve ter no máximo 5 MB.";
  }
  return null;
}

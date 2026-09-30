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

/** Tamanho máximo do arquivo ORIGINAL escolhido (antes da compressão). */
export const MENU_IMAGE_SOURCE_MAX_BYTES = 20 * 1024 * 1024;

export function validateMenuImageFile(file: File): string | null {
  if (!(MENU_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Formato não suportado. Use JPG, PNG ou WEBP.";
  }
  if (file.size > MENU_IMAGE_SOURCE_MAX_BYTES) {
    return "A imagem deve ter no máximo 20 MB.";
  }
  return null;
}

/**
 * Reduz a foto no navegador (lado maior até 1200 px) e converte para WEBP.
 * Sem otimizador de imagens no servidor (Cloudflare Workers), isso mantém
 * o cardápio leve no celular. Se o navegador não suportar, envia o original.
 */
export async function compressMenuImage(file: File, maxSide = 1200, quality = 0.82): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    // Alguns navegadores antigos não geram WEBP: usa o original
    return blob && blob.type === "image/webp" && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

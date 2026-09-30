"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  MENU_IMAGES_BUCKET,
  validateMenuImageFile,
  type MenuImageFolder,
} from "@/lib/catalog/images";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ImageUploadProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: MenuImageFolder;
  label?: string;
  className?: string;
};

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Envia a imagem direto do navegador para o Supabase Storage.
 * A política do bucket só permite envio por admin. A imagem antiga é
 * removida pelo servidor quando o formulário é salvo.
 */
export function ImageUpload({ value, onChange, folder, label = "Foto", className }: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    const validation = validateMenuImageFile(file);
    if (validation) {
      setError(validation);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${folder}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
      const { error: uploadError } = await supabase.storage
        .from(MENU_IMAGES_BUCKET)
        .upload(path, file, { cacheControl: "31536000", contentType: file.type });

      if (uploadError) {
        console.error("[upload]", uploadError.message);
        setError("Não foi possível enviar a imagem. Tente novamente.");
        return;
      }

      const { data } = supabase.storage.from(MENU_IMAGES_BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-sm font-medium">{label}</span>

      <div className="relative flex aspect-4/3 w-full max-w-xs items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/40">
        {value ? (
          <Image
            src={value}
            alt="Pré-visualização"
            fill
            sizes="320px"
            className="object-cover"
          />
        ) : (
          <label
            htmlFor={inputId}
            className="flex size-full cursor-pointer flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <ImagePlus className="size-7" aria-hidden />
            Escolher imagem
            <span className="text-xs">JPG, PNG ou WEBP · até 5 MB</span>
          </label>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-6 animate-spin" aria-label="Enviando" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {value && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus aria-hidden />
            Trocar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={() => onChange(null)}
          >
            <Trash2 aria-hidden />
            Remover
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProductFiltersProps = {
  categories: { id: string; name: string }[];
};

const ALL = "todas";

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  // Busca com pequeno atraso para não recarregar a cada tecla
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (search.trim() === current) return;
    const timer = setTimeout(() => update("q", search.trim() || null), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Buscar produto…"
          aria-label="Buscar produto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 pl-9"
        />
      </div>

      <Select
        value={searchParams.get("categoria") ?? ALL}
        onValueChange={(value) => update("categoria", value === ALL ? null : value)}
      >
        <SelectTrigger className="h-10! w-full sm:w-52" aria-label="Filtrar por categoria">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as categorias</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("status") ?? "ativos"}
        onValueChange={(value) => update("status", value === "ativos" ? null : value)}
      >
        <SelectTrigger className="h-10! w-full sm:w-40" aria-label="Filtrar por situação">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ativos">Ativos</SelectItem>
          <SelectItem value="esgotados">Esgotados</SelectItem>
          <SelectItem value="arquivados">Arquivados</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

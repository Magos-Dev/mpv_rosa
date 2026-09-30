import { Skeleton } from "@/components/ui/skeleton";

export default function CourierLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <span className="sr-only">Carregando…</span>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}

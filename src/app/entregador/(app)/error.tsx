"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/feedback/error-state";

export default function CourierError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorState onRetry={retry} />;
}

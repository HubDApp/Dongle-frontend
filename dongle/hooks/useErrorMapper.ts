import { useState, useCallback } from "react";
import { mapError, MappedError, ErrorCategory } from "@/lib/error-mapper";
import { toast } from "sonner";

interface UseErrorMapperOptions {
  showToast?: boolean;
  category?: ErrorCategory;
}

export function useErrorMapper(options: UseErrorMapperOptions = {}) {
  const { showToast = true, category } = options;
  const [error, setError] = useState<MappedError | null>(null);

  const handleError = useCallback(
    (err: unknown, customCategory?: ErrorCategory) => {
      const mapped = mapError(err, customCategory || category);
      setError(mapped);

      if (showToast) {
        toast.error(mapped.userMessage, {
          description: mapped.actionable,
        });
      }

      // Log technical details for debugging
      if (process.env.NODE_ENV === "development") {
        console.error("Mapped Error:", mapped);
        console.error("Original Error:", err);
      }

      return mapped;
    },
    [showToast, category]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
    hasError: error !== null,
  };
}

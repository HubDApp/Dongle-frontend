export type AsyncFieldValidationResult = true | string;

export type AsyncFieldValidator<TValue> = (
  value: TValue,
  signal: AbortSignal,
) => Promise<AsyncFieldValidationResult>;

export interface DebouncedAsyncFieldValidationOptions {
  debounceMs?: number;
  emptyValueIsValid?: boolean;
  fallbackMessage?: string;
}

export interface DebouncedAsyncFieldValidator<TValue> {
  validate(value: TValue): Promise<AsyncFieldValidationResult>;
  isLoading(): boolean;
  cancel(): void;
}

export function createDebouncedAsyncFieldValidator<TValue>(
  validator: AsyncFieldValidator<TValue>,
  options: DebouncedAsyncFieldValidationOptions = {},
): DebouncedAsyncFieldValidator<TValue> {
  const debounceMs = options.debounceMs ?? 300;
  const emptyValueIsValid = options.emptyValueIsValid ?? true;
  const fallbackMessage = options.fallbackMessage ?? "Validation failed. Please try again.";

  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let loading = false;

  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    controller?.abort();
    controller = null;
    loading = false;
  };

  const validate = (value: TValue): Promise<AsyncFieldValidationResult> => {
    if (
      emptyValueIsValid &&
      (value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim().length === 0))
    ) {
      cancel();
      return Promise.resolve(true);
    }

    cancel();
    loading = true;
    controller = new AbortController();
    const activeController = controller;

    return new Promise((resolve) => {
      timer = setTimeout(async () => {
        timer = null;
        try {
          const result = await validator(value, activeController.signal);
          if (activeController.signal.aborted) return;
          resolve(result);
        } catch (error) {
          if (activeController.signal.aborted) return;
          resolve(error instanceof Error ? error.message : fallbackMessage);
        } finally {
          if (controller === activeController) {
            controller = null;
            loading = false;
          }
        }
      }, debounceMs);
    });
  };

  return {
    validate,
    isLoading: () => loading,
    cancel,
  };
}

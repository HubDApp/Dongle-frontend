import { describe, expect, it, vi } from "vitest";
import { createDebouncedAsyncFieldValidator } from "@/lib/async-field-validation";

describe("createDebouncedAsyncFieldValidator", () => {
  it("debounces async validation", async () => {
    vi.useFakeTimers();
    const validator = vi.fn(async () => true as const);
    const fieldValidator = createDebouncedAsyncFieldValidator(validator, { debounceMs: 250 });

    const resultPromise = fieldValidator.validate("alpha");
    expect(fieldValidator.isLoading()).toBe(true);
    expect(validator).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(249);
    expect(validator).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await expect(resultPromise).resolves.toBe(true);
    expect(validator).toHaveBeenCalledWith("alpha", expect.any(AbortSignal));
    expect(fieldValidator.isLoading()).toBe(false);
    vi.useRealTimers();
  });

  it("returns validator errors as react-hook-form compatible messages", async () => {
    vi.useFakeTimers();
    const fieldValidator = createDebouncedAsyncFieldValidator(
      async () => "Name is already taken",
      { debounceMs: 10 },
    );

    const resultPromise = fieldValidator.validate("taken");
    await vi.advanceTimersByTimeAsync(10);

    await expect(resultPromise).resolves.toBe("Name is already taken");
    vi.useRealTimers();
  });

  it("short-circuits empty values when configured", async () => {
    const validator = vi.fn(async () => "Should not run");
    const fieldValidator = createDebouncedAsyncFieldValidator(validator);

    await expect(fieldValidator.validate("   ")).resolves.toBe(true);
    expect(validator).not.toHaveBeenCalled();
  });
});

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { ConfirmDialog, ConfirmDialogOptions } from "@/components/ui/ConfirmDialog";

// ─── Context ─────────────────────────────────────────────────────────────────

type ConfirmFn = (options: ConfirmDialogOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

/**
 * Mount this once near the root of your app (inside the existing WalletProvider
 * is fine). It renders a single shared ConfirmDialog instance.
 *
 * Usage in any child component:
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: "...", description: "..." });
 *   if (ok) { ... }
 */
export function ConfirmDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions>({
    title: "",
    description: "",
  });

  // Store the resolve function of the pending promise so we can settle it from
  // the dialog buttons without React state gymnastics.
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm: ConfirmFn = useCallback((opts) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    resolveRef.current?.(true);
    resolveRef.current = null;
  };

  const handleCancel = () => {
    setIsOpen(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        isOpen={isOpen}
        {...options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Returns an async `confirm(options)` function that resolves `true` when the
 * user clicks Confirm and `false` when they cancel or press Escape.
 *
 * Must be called inside a component that is a descendant of ConfirmDialogProvider.
 */
export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) {
    return async (options) => {
      if (typeof window !== "undefined") {
        return window.confirm(`${options.title}\n\n${options.description}`);
      }
      return true;
    };
  }
  return fn;
}

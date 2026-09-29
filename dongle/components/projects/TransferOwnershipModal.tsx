"use client";

import React, { useState, useEffect, useRef } from "react";
import { UserPlus, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import { validateStellarAddress, abbreviateStellarAddress } from "@/lib/stellar-address";

interface TransferOwnershipModalProps {
  isOpen: boolean;
  projectName: string;
  currentOwnerAddress: string;
  onClose: () => void;
  onTransfer: (newOwnerAddress: string) => Promise<void>;
  isTransferring?: boolean;
}

export function TransferOwnershipModal({
  isOpen,
  projectName,
  currentOwnerAddress,
  onClose,
  onTransfer,
  isTransferring = false,
}: TransferOwnershipModalProps) {
  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useModalFocusTrap(isOpen, dialogRef, inputRef, onClose);

  if (!isOpen) return null;

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewOwnerAddress(value);
    if (validationError) setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = validateStellarAddress(newOwnerAddress);
    if (!result.valid) {
      setValidationError(result.error);
      return;
    }

    // Prevent transferring to self
    if (result.normalized === currentOwnerAddress.toUpperCase()) {
      setValidationError("You cannot transfer ownership to yourself. The new owner must be a different Stellar address.");
      return;
    }

    await onTransfer(result.normalized);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-md bg-white dark:bg-zinc-900",
          "border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl",
          "p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
        )}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-amber-100 dark:bg-amber-900/30">
          <UserPlus className="w-6 h-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        </div>

        <h2 id="transfer-dialog-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Transfer Project Ownership
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
          Transfer ownership of <strong className="text-zinc-800 dark:text-zinc-200">{projectName}</strong> to a new Stellar wallet address.
          This action is irreversible and will immediately transfer all management rights.
        </p>

        {/* Current owner info */}
        <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-zinc-400" />
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Current Owner</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                {abbreviateStellarAddress(currentOwnerAddress)}
              </p>
            </div>
          </div>
        </div>

        <form key={String(isOpen)} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-owner-address" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              New Owner Stellar Address
            </label>
            <input
              ref={inputRef}
              id="new-owner-address"
              type="text"
              value={newOwnerAddress}
              onChange={handleAddressChange}
              placeholder="GABC...1234"
              className={cn(
                "w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border rounded-2xl transition-all outline-none font-mono text-sm",
                "focus:ring-2 focus:ring-blue-500/20",
                validationError
                  ? "border-red-500/50 focus:border-red-500"
                  : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50",
              )}
              maxLength={56}
              disabled={isTransferring}
              autoComplete="off"
              spellCheck={false}
            />
            {validationError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {validationError}
              </p>
            )}
            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
              Enter the Stellar public address (starting with &quot;G&quot;) of the new owner.
            </p>
          </div>

          {/* Warning about ownership transfer implications */}
          <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                  Irreversible Action
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 leading-relaxed">
                  Once transferred, only the new owner will be able to edit project details,
                  post updates, manage verification, and request future ownership changes.
                  This action cannot be undone. Ensure the recipient address is correct.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isTransferring}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="error"
              isLoading={isTransferring}
              loadingText="Transferring..."
            >
              Transfer Ownership
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

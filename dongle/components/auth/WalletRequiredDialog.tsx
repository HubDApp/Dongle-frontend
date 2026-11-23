"use client";

import { useAuth } from "@/context/auth.context";
import { useWallet } from "@/context/wallet.context";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function WalletRequiredDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { connectWallet, isConnecting } = useWallet();
  const { isReadOnly } = useAuth();

  if (!open || !isReadOnly) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="wallet-required-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-950">
        <h2 id="wallet-required-title" className="text-lg font-semibold">
          {t("auth.walletRequiredTitle")}
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {t("auth.walletRequiredBody")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              void connectWallet();
              onClose();
            }}
            isLoading={isConnecting}
          >
            {t("auth.walletRequiredCta")}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}

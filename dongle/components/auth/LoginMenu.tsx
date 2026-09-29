"use client";

import { Suspense, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/context/wallet.context";
import { useAuth } from "@/context/auth.context";
import { useTranslation } from "@/lib/i18n/useTranslation";
import AddressDisplay from "@/components/ui/AddressDisplay";
import { EXPECTED_NETWORK_LABEL } from "@/context/wallet.context";

function GoogleMark() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.76-.07-1.33-.22-1.91H12v3.46h5.48c-.11.9-.71 2.26-2.05 3.18l-.02.1 2.98 2.26.2.02c1.9-1.76 3-4.35 3-7.11z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.7 0 4.96-.9 6.61-2.44l-3.15-2.39c-.84.58-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15l-.09.01-3.08 2.33-.04.09C4.73 19.98 8.09 22 12 22z"
      />
      <path
        fill="currentColor"
        d="M6.32 13.02A6.01 6.01 0 0 1 6 12c0-.35.03-.7.08-1.02l-.01-.1-3.12-2.37-.1.05A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.06 4.48l3.26-3.46z"
      />
      <path
        fill="currentColor"
        d="M12 5.94c1.88 0 3.15.81 3.87 1.49l2.83-2.76C16.95 2.95 14.7 2 12 2 8.09 2 4.73 4.02 3.06 7.52l3.26 3.46C7.12 7.68 9.36 5.94 12 5.94z"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.24-3.22-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"
      />
    </svg>
  );
}

function LoginMenuInner() {
  const { t } = useTranslation();
  const {
    isConnected,
    isConnecting,
    publicKey,
    isCorrectNetwork,
    walletNetworkLabel,
    connectWallet,
    disconnectWallet,
  } = useWallet();
  const { user, isOAuth, isReadOnly, startOAuth, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (isConnected) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <span
          title={t("wallet.expectedNetwork", { network: EXPECTED_NETWORK_LABEL })}
          className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isCorrectNetwork
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              : "animate-pulse bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isCorrectNetwork ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          {isCorrectNetwork ? EXPECTED_NETWORK_LABEL : walletNetworkLabel}
        </span>
        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-100 p-1.5 pl-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
          {publicKey ? (
            <AddressDisplay address={publicKey} copyable truncated inline />
          ) : (
            <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
              {t("wallet.connected")}
            </span>
          )}
          <Button
            onClick={disconnectWallet}
            variant="outline"
            size="sm"
            className="rounded-full border-zinc-200 bg-white px-3 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
          >
            {t("wallet.disconnect")}
          </Button>
        </div>
      </div>
    );
  }

  if (isOAuth && user) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        {isReadOnly ? (
          <span className="hidden max-w-[12rem] truncate text-xs text-zinc-500 lg:inline">
            {t("auth.readOnlyBanner")}
          </span>
        ) : null}
        <Button onClick={connectWallet} isLoading={isConnecting} size="sm" className="rounded-full">
          {t("auth.connectWallet")}
        </Button>
        <div className="relative" ref={rootRef}>
          <button
            type="button"
            className="inline-flex max-w-[10rem] items-center gap-2 truncate rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-900"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={t("auth.account")}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="truncate">{user.name ?? user.email ?? t("auth.account")}</span>
          </button>
          {open ? (
            <div
              id={menuId}
              className="absolute end-0 z-50 mt-2 min-w-[12rem] rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            >
              <p className="truncate px-2 py-1 text-xs text-zinc-500">
                {t("auth.signedInAs", { name: user.name ?? user.email ?? user.provider })}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 w-full justify-start"
                onClick={() => void signOut()}
              >
                {t("auth.signOut")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <Button
        onClick={() => setOpen((v) => !v)}
        isLoading={isConnecting}
        size="sm"
        className="rounded-full"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
      >
        {t("auth.signIn")}
      </Button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute end-0 z-50 mt-2 min-w-[14rem] space-y-1 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <Button
            role="menuitem"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              setOpen(false);
              void connectWallet();
            }}
          >
            {t("wallet.connect")}
          </Button>
          <Button
            role="menuitem"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            leftIcon={<GoogleMark />}
            aria-label={t("auth.signInWithGoogle")}
            onClick={() => startOAuth("google")}
          >
            {t("auth.signInWithGoogle")}
          </Button>
          <Button
            role="menuitem"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            leftIcon={<GitHubMark />}
            aria-label={t("auth.signInWithGitHub")}
            onClick={() => startOAuth("github")}
          >
            {t("auth.signInWithGitHub")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function LoginMenu() {
  return (
    <Suspense fallback={null}>
      <LoginMenuInner />
    </Suspense>
  );
}

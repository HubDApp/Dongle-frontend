"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";

const UNSAVED_WARNING = {
  title: "Unsaved Changes",
  description: "You have unsaved changes. Are you sure you want to leave this page?",
  confirmLabel: "Leave Page",
  cancelLabel: "Stay Here",
  variant: "danger" as const,
};

/**
 * Reusable hook to prevent losing unsaved form changes.
 * Warns before tab close/reloads, and client-side Next.js route transitions.
 * Submitted or reset forms (isDirty=false or isSubmitting=true) do not warn.
 */
export function useUnsavedChanges(isDirty: boolean, isSubmitting: boolean = false) {
  const router = useRouter();
  const confirm = useConfirm();
  const allowLeaveRef = useRef(false);

  useEffect(() => {
    if (!isDirty || isSubmitting) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) return;
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    const handleAnchorClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      let target = e.target as HTMLElement | null;
      while (target && target.tagName !== "A") {
        target = target.parentElement;
      }

      if (!(target instanceof HTMLAnchorElement)) return;

      const href = target.getAttribute("href");
      if (!href) return;
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        href.startsWith("http://") ||
        href.startsWith("https://")
      ) {
        return;
      }

      const current = `${window.location.pathname}${window.location.search}`;
      if (href === current) return;

      e.preventDefault();
      e.stopPropagation();

      void (async () => {
        const ok = await confirm(UNSAVED_WARNING);
        if (ok) {
          allowLeaveRef.current = true;
          router.push(href);
        }
      })();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleAnchorClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleAnchorClick, true);
    };
  }, [isDirty, isSubmitting, confirm, router]);
}

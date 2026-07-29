"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";

/**
 * Reusable hook to prevent losing unsaved form changes.
 * Warns before tab close/reloads, and client-side Next.js route transitions.
 */
export function useUnsavedChanges(isDirty: boolean, isSubmitting: boolean = false) {
  const router = useRouter();
  const confirm = useConfirm();

  useEffect(() => {
    if (!isDirty || isSubmitting) return;

    // 1. Intercept browser window/tab closing or reload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // standard spec requires setting returnValue
      e.returnValue = "";
      return "";
    };

    // 2. Intercept client-side Next.js route changes (anchor clicks)
    const handleAnchorClick = (e: MouseEvent) => {
      // Traverse up to find anchor tag
      let target = e.target as HTMLElement | null;
      while (target && target.tagName !== "A") {
        target = target.parentElement;
      }

      if (target && target instanceof HTMLAnchorElement) {
        const href = target.getAttribute("href");

        // Ignore hash links, target="_blank", mailto/tel, and external domains
        if (
          href &&
          !href.startsWith("#") &&
          !href.startsWith("mailto:") &&
          !href.startsWith("tel:") &&
          target.target !== "_blank" &&
          !href.startsWith("http://") &&
          !href.startsWith("https://")
        ) {
          e.preventDefault();
          e.stopPropagation();

          void (async () => {
            const ok = await confirm({
              title: "Unsaved Changes",
              description: "You have unsaved changes. Are you sure you want to leave this page?",
              confirmLabel: "Leave Page",
              cancelLabel: "Stay Here",
              variant: "danger",
            });
            if (ok) {
              router.push(href);
            }
          })();
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleAnchorClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleAnchorClick, true);
    };
  }, [isDirty, isSubmitting, confirm, router]);
}

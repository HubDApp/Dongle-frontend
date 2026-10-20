import { useState, useCallback } from "react";

export interface UseCopyToClipboardReturn {
  isCopied: boolean;
  copy: (text: string) => Promise<void>;
  reset: () => void;
}

export function useCopyToClipboard(timeout = 2000): UseCopyToClipboardReturn {
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), timeout);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), timeout);
      }
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  }, [timeout]);

  const reset = useCallback(() => {
    setIsCopied(false);
  }, []);

  return { isCopied, copy, reset };
}

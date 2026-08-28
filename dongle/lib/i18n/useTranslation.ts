/**
 * React hook for using translations in components
 */

"use client";

import { useCallback } from "react";
import { t, getMessages, type Messages } from "./index";
import * as format from "./format";

interface UseTranslationReturn {
  /**
   * Translate a message key
   */
  t: typeof t;
  
  /**
   * Get all messages for the current locale
   */
  messages: Messages;
  
  /**
   * Formatting utilities
   */
  format: typeof format;
}

/**
 * Hook for using translations in React components
 * 
 * @example
 * function MyComponent() {
 *   const { t, format } = useTranslation();
 *   
 *   return (
 *     <div>
 *       <h1>{t("nav.discover")}</h1>
 *       <p>{format.formatDate(new Date())}</p>
 *     </div>
 *   );
 * }
 */
export function useTranslation(): UseTranslationReturn {
  const messages = getMessages();

  // Memoize t function to prevent unnecessary re-renders
  const translate = useCallback(t, []);

  return {
    t: translate,
    messages,
    format,
  };
}

/**
 * Shared in-memory template store for /api/templates routes.
 * Replace with a real DB / KV store in production.
 */

import type { FormTemplate } from "@/types/form-template";

export const templateStore = new Map<string, Map<string, FormTemplate>>();

export function isValidWalletAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address);
}

export function getWalletTemplates(walletAddress: string): Map<string, FormTemplate> {
  if (!templateStore.has(walletAddress)) {
    templateStore.set(walletAddress, new Map());
  }
  return templateStore.get(walletAddress)!;
}

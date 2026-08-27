/**
 * Lazy-loading wrapper for Stellar service
 * 
 * Dynamically imports stellar.service only when account data is needed.
 * Prevents stellar-sdk Horizon types from being in the initial bundle.
 */

import type { Horizon } from "stellar-sdk";

let stellarServiceCache: typeof import("./stellar.service").stellarService | null = null;

/**
 * Dynamically import and return the stellar service
 */
async function loadStellarService() {
  if (stellarServiceCache) {
    return stellarServiceCache;
  }

  const module = await import(/* webpackChunkName: "stellar-service" */ "./stellar.service");
  stellarServiceCache = module.stellarService;
  return stellarServiceCache;
}

/**
 * Lazy-loading stellar service
 * 
 * Methods are async and trigger dynamic import on first call.
 */
export const lazyStellarService = {
  /**
   * Fetch account details from Horizon
   */
  async getAccount(publicKey: string): Promise<Horizon.ServerApi.AccountRecord> {
    const service = await loadStellarService();
    return service.getAccount(publicKey);
  },

  /**
   * Fetch account balances
   */
  async getBalances(publicKey: string): Promise<Horizon.HorizonApi.BalanceLine[]> {
    const service = await loadStellarService();
    return service.getBalances(publicKey);
  },
};

/**
 * Preload the stellar service
 */
export function preloadStellarService(): void {
  void loadStellarService();
}

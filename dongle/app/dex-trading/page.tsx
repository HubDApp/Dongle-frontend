import { DexTradingCard } from "@/components/dex-trading-card";

/**
 * Stellar DEX trading data page.
 *
 * Demo page demonstrating issue #725: Show Token Trading Data from Stellar DEX.
 * Pass a token code + issuer to view trading metrics, 7-day chart, liquidity,
 * and a link to trade on the DEX.
 */
export default function DexTradingPage() {
  // Example: a sample token. In practice these come from the project's contract metadata.
  const tokenCode = "USDC";
  const tokenIssuer = "GA5ZSEJYB37JRC5AVCIA5MOP4YHTMCEJ4GD2RYR5K2XS7KKKVDA7XGM2";

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Token Trading Data</h1>
      <p className="text-muted-foreground mb-6">
        Trading metrics for the project's token on the Stellar DEX, fetched from
        the Horizon /trades endpoint and cached for 5 minutes.
      </p>
      <DexTradingCard tokenCode={tokenCode} tokenIssuer={tokenIssuer} />
    </div>
  );
}

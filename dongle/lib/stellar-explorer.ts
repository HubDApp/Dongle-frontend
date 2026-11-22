const MAINNET_PASSPHRASE = "Public Global Stellar Network ; September 2015";

export function getExplorerNetwork(): "public" | "testnet" {
  return process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE === MAINNET_PASSPHRASE
    ? "public"
    : "testnet";
}

export function getHorizonUrl(): string {
  return (
    process.env.NEXT_PUBLIC_HORIZON_URL ??
    (getExplorerNetwork() === "public"
      ? "https://horizon.stellar.org"
      : "https://horizon-testnet.stellar.org")
  );
}

export const stellarExpertTxUrl = (hash: string) =>
  `https://stellar.expert/explorer/${getExplorerNetwork()}/tx/${hash}`;

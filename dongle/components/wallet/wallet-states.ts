import { EXPECTED_NETWORK_LABEL } from "@/context/wallet.context";

export const FREIGHTER_INSTALL_URL = "https://www.freighter.app/";
export const FRIENDBOT_BASE_URL = "https://friendbot.stellar.org";

export type WalletPageState =
  | "ready"
  | "freighter-missing"
  | "connecting"
  | "disconnected"
  | "wrong-network"
  | "account-loading"
  | "account-not-funded";

export interface WalletStateContent {
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    href?: string;
    external?: boolean;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    external?: boolean;
  };
}

export function getFriendbotUrl(publicKey: string): string {
  return `${FRIENDBOT_BASE_URL}?addr=${encodeURIComponent(publicKey)}`;
}

export function isAccountNotFundedError(error: string | null | undefined): boolean {
  if (!error) return false;
  const normalized = error.toLowerCase();
  return (
    normalized.includes("account not found") ||
    normalized.includes("not funded") ||
    normalized.includes("friendbot")
  );
}

export function getWalletStateContent(
  state: Exclude<WalletPageState, "ready" | "account-loading">,
  options: {
    walletNetworkLabel?: string;
    publicKey?: string | null;
    pagePurpose?: string;
  } = {},
): WalletStateContent {
  const purpose =
    options.pagePurpose ??
    "Connect your Stellar wallet to use this page on Dongle.";

  switch (state) {
    case "freighter-missing":
      return {
        title: "Install Freighter Wallet",
        description:
          "Dongle uses Freighter, the Stellar browser extension, to connect your wallet and sign transactions securely.",
        primaryAction: {
          label: "Get Freighter",
          href: FREIGHTER_INSTALL_URL,
          external: true,
        },
      };
    case "connecting":
      return {
        title: "Connecting Wallet",
        description: "Approve the connection request in your Freighter extension.",
      };
    case "disconnected":
      return {
        title: "Connect Your Wallet",
        description: purpose,
        primaryAction: {
          label: "Connect Wallet",
        },
      };
    case "wrong-network":
      return {
        title: "Wrong Network",
        description: `Your Freighter wallet is on ${options.walletNetworkLabel ?? "an unsupported network"}. Switch to ${EXPECTED_NETWORK_LABEL} in Freighter (Settings → Network) before continuing.`,
        primaryAction: {
          label: "Open Freighter Docs",
          href: "https://developers.stellar.org/docs/build/guides/freighter/connect-testnet",
          external: true,
        },
      };
    case "account-not-funded":
      return {
        title: "Fund Your Testnet Account",
        description:
          "Your wallet address is not funded on Stellar Testnet yet. Use Friendbot to receive free test XLM, then return here.",
        primaryAction: options.publicKey
          ? {
              label: "Fund with Friendbot",
              href: getFriendbotUrl(options.publicKey),
              external: true,
            }
          : undefined,
        secondaryAction: {
          label: "Disconnect Wallet",
        },
      };
    default:
      return {
        title: "Wallet Required",
        description: purpose,
      };
  }
}

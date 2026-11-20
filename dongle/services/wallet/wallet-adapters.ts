import { walletService } from "./wallet.service";
import { SOROBAN_CONFIG } from "@/constants/contracts";

export type WalletType = "freighter" | "ledger" | "albedo";

export const WALLET_TYPES: WalletType[] = ["freighter", "ledger", "albedo"];

export const WALLET_META: Record<
  WalletType,
  { name: string; description: string; instructions: string[] }
> = {
  freighter: {
    name: "Freighter",
    description: "Browser extension wallet",
    instructions: [
      "Install the Freighter extension from freighter.app.",
      "Unlock Freighter and select your account.",
      "Approve the connection request in the popup.",
    ],
  },
  ledger: {
    name: "Ledger",
    description: "Hardware wallet over USB",
    instructions: [
      "Connect your Ledger via USB and unlock it with your PIN.",
      "Open the Stellar app on the device.",
      "Allow the browser USB permission prompt and pick your Ledger.",
    ],
  },
  albedo: {
    name: "Albedo",
    description: "Web-based wallet, no install needed",
    instructions: [
      "Allow popups for this site.",
      "Sign in to Albedo in the window that opens.",
      "Confirm sharing your public key.",
    ],
  },
};

/** BIP-44 path for the first Stellar account on Ledger. */
const LEDGER_PATH = "44'/148'/0'";

/** WebUSB is only available in Chromium-based browsers over HTTPS. */
export function isLedgerSupported(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

async function openLedger() {
  if (!isLedgerSupported()) {
    throw new Error(
      "Your browser does not support USB hardware wallets. Use Chrome, Edge or Brave, or choose another wallet.",
    );
  }
  const [{ default: TransportWebUSB }, { default: Str }] = await Promise.all([
    import("@ledgerhq/hw-transport-webusb"),
    import("@ledgerhq/hw-app-str"),
  ]);
  try {
    const transport = await TransportWebUSB.create();
    return { transport, app: new Str(transport) };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TransportOpenUserCancelled" || name === "NotFoundError") {
      throw new Error("USB permission was denied. Reconnect your Ledger and allow access.");
    }
    throw new Error("Ledger not found. Make sure it is plugged in, unlocked and the Stellar app is open.");
  }
}

async function albedo() {
  return (await import("@albedo-link/intent")).default;
}

function albedoNetwork(passphrase: string) {
  return passphrase.includes("Public Global") ? "public" : "testnet";
}

/** Connect with the given wallet type and return the public key. */
export async function connectWithWallet(type: WalletType): Promise<string> {
  switch (type) {
    case "ledger": {
      const { transport, app } = await openLedger();
      try {
        const { rawPublicKey } = await app.getPublicKey(LEDGER_PATH);
        const { StrKey } = await import("stellar-sdk");
        return StrKey.encodeEd25519PublicKey(rawPublicKey);
      } finally {
        await transport.close();
      }
    }
    case "albedo": {
      const res = await (await albedo()).publicKey({});
      return res.pubkey;
    }
    default:
      return walletService.connectWallet();
  }
}

/** Sign a transaction XDR with the given wallet type. */
export async function signWithWallet(
  type: WalletType,
  xdr: string,
  networkPassphrase: string,
): Promise<string> {
  switch (type) {
    case "ledger": {
      const { TransactionBuilder, StrKey } = await import("stellar-sdk");
      const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
      const { transport, app } = await openLedger();
      try {
        const { rawPublicKey } = await app.getPublicKey(LEDGER_PATH);
        const { signature } = await app.signTransaction(LEDGER_PATH, tx.hash());
        tx.addSignature(
          StrKey.encodeEd25519PublicKey(rawPublicKey),
          signature.toString("base64"),
        );
        return tx.toXDR();
      } finally {
        await transport.close();
      }
    }
    case "albedo": {
      const res = await (await albedo()).tx({
        xdr,
        network: albedoNetwork(networkPassphrase),
      });
      return res.signed_envelope_xdr;
    }
    default:
      return walletService.signTransaction(xdr, networkPassphrase);
  }
}

/**
 * Freighter exposes the active network; Ledger and Albedo sign for whatever
 * network the app requests, so they always report the expected network.
 */
export async function getWalletNetwork(type: WalletType): Promise<string | null> {
  if (type === "freighter") return walletService.getNetworkPassphrase();
  return SOROBAN_CONFIG.NETWORK_PASSPHRASE;
}

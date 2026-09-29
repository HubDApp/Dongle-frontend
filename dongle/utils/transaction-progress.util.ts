export type TransactionPhase =
  | "idle"
  | "preparing"
  | "signing"
  | "submitting"
  | "confirming"
  | "success"
  | "failure";

export interface TransactionPhaseMeta {
  txHash?: string;
  error?: Error;
}

export interface TransactionProgressState {
  phase: TransactionPhase;
  message: string;
  txHash?: string;
  errorMessage?: string;
  retryable: boolean;
}

export type ProgressStep = Exclude<TransactionPhase, "idle" | "failure">;

export const TRANSACTION_PHASE_ORDER: ProgressStep[] = [
  "preparing",
  "signing",
  "submitting",
  "confirming",
  "success",
];

export const TRANSACTION_PHASE_LABELS: Record<ProgressStep, string> = {
  preparing: "Preparing transaction",
  signing: "Approve in Freighter",
  submitting: "Submitting to network",
  confirming: "Waiting for confirmation",
  success: "Confirmed on-chain",
};

export function getTransactionPhaseMessage(
  phase: TransactionPhase,
  meta: TransactionPhaseMeta = {},
): string {
  switch (phase) {
    case "preparing":
      return "Building and simulating your Soroban transaction...";
    case "signing":
      return "Check your Freighter extension and approve the signature request.";
    case "submitting":
      return "Broadcasting the signed transaction to Stellar...";
    case "confirming":
      return meta.txHash
        ? `Waiting for network confirmation (${meta.txHash.slice(0, 8)}...).`
        : "Waiting for network confirmation. This can take up to a minute.";
    case "success":
      return meta.txHash
        ? `Transaction confirmed: ${meta.txHash.slice(0, 8)}...`
        : "Transaction confirmed on-chain.";
    case "failure": {
      const base = meta.error?.message ?? "Transaction failed.";
      if (isUserRejectionError(meta.error)) {
        return `${base} You can edit your details and try again when ready.`;
      }
      if (isNetworkMismatchError(meta.error)) {
        return `${base} Switch Freighter to the expected network, then retry.`;
      }
      return `${base} Review the details below and retry when ready.`;
    }
    default:
      return "";
  }
}

export function isUserRejectionError(error?: Error): boolean {
  if (!error) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("user rejected") ||
    msg.includes("user declined") ||
    msg.includes("cancelled") ||
    msg.includes("canceled")
  );
}

export function isNetworkMismatchError(error?: Error): boolean {
  if (!error) return false;
  return error.name === "NetworkMismatchError" || error.message.includes("Wrong network");
}

export function isTransactionPhaseRetryable(error?: Error): boolean {
  if (!error) return true;
  return !isUserRejectionError(error);
}

export function createProgressState(
  phase: TransactionPhase,
  meta: TransactionPhaseMeta = {},
): TransactionProgressState {
  return {
    phase,
    message: getTransactionPhaseMessage(phase, meta),
    txHash: meta.txHash,
    errorMessage: meta.error?.message,
    retryable: phase === "failure" ? isTransactionPhaseRetryable(meta.error) : false,
  };
}

export function getPhaseIndex(phase: TransactionPhase): number {
  if (phase === "idle" || phase === "failure") return -1;
  return TRANSACTION_PHASE_ORDER.indexOf(phase);
}

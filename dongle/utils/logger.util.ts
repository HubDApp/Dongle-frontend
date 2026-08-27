import { redactWalletAddress } from "./stellar-address.util";

type LogLevel = "debug" | "info" | "warn" | "error";

const WALLET_ADDRESS_RE = /\bG[A-Z2-7]{55}\b/g;
const CONTRACT_ID_RE = /\bC[A-Z2-7]{55}\b/g;
const HASH_RE = /\b[a-f0-9]{64}\b/gi;

function isEnabled(level: LogLevel): boolean {
  if (level === "error" || level === "warn") return true;
  return process.env.NODE_ENV === "development";
}

function redactMessage(message: string): string {
  return message
    .replace(WALLET_ADDRESS_RE, (address) => redactWalletAddress(address))
    .replace(CONTRACT_ID_RE, "[contract]")
    .replace(HASH_RE, (m) => `${m.slice(0, 6)}…${m.slice(-4)}`);
}

function formatArg(arg: unknown): unknown {
  if (typeof arg === "string") return redactMessage(arg);
  if (arg instanceof Error) {
    const err = arg as Error;
    const safe = new Error(redactMessage(err.message));
    safe.name = err.name;
    safe.stack = err.stack ? redactMessage(err.stack) : undefined;
    return safe;
  }
  if (Array.isArray(arg)) return arg.map(formatArg);
  if (arg && typeof arg === "object") {
    return Object.fromEntries(
      Object.entries(arg).map(([key, value]) => [
        key,
        /address|publickey|wallet|recipient|submittedby|assignedto/i.test(key) && typeof value === "string"
          ? redactWalletAddress(value)
          : formatArg(value),
      ]),
    );
  }
  return arg;
}

function formatArgs(args: unknown[]): unknown[] {
  return args.map(formatArg);
}

export const logger = {
  debug(...args: unknown[]) {
    if (isEnabled("debug")) {
      console.debug("[debug]", ...formatArgs(args));
    }
  },

  info(...args: unknown[]) {
    if (isEnabled("info")) {
      console.info("[info]", ...formatArgs(args));
    }
  },

  warn(...args: unknown[]) {
    console.warn("[warn]", ...formatArgs(args));
  },

  error(...args: unknown[]) {
    console.error("[error]", ...formatArgs(args));
  },
};

export function truncateHash(hash: string): string {
  if (!hash || hash.length < 10) return hash ?? "";
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export function truncateAddress(address: string): string {
  return redactWalletAddress(address);
}

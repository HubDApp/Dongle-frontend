import { SorobanEventListener } from "@/services/indexer/soroban-listener.service";

const rpcUrl = process.env.SOROBAN_RPC_URL ?? process.env.NEXT_PUBLIC_SOROBAN_RPC_URL;
const contractId = process.env.SOROBAN_CONTRACT_ID ?? process.env.NEXT_PUBLIC_SOROBAN_CONTRACT_ID;
const initialLedger = process.env.SOROBAN_START_LEDGER
  ? Number(process.env.SOROBAN_START_LEDGER)
  : undefined;

if (!rpcUrl || !contractId) {
  throw new Error("SOROBAN_RPC_URL and SOROBAN_CONTRACT_ID are required");
}

const listener = new SorobanEventListener({ rpcUrl, contractId, initialLedger });
listener.start((count) => {
  if (count > 0) console.info(`[soroban-indexer] processed ${count} event(s), ledger ${listener.getLastLedger()}`);
});
console.info(`[soroban-indexer] listening for contract ${contractId}`);

const stop = () => {
  listener.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
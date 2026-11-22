/**
 * Soroban contract ABI introspection: loads the contract's spec (embedded in
 * its WASM, fetched via Soroban RPC) and exposes methods, params and docs.
 */
import { SOROBAN_CONFIG } from "@/constants/contracts";

export interface ContractParam {
  name: string;
  type: string;
}

export interface ContractMethod {
  name: string;
  doc: string;
  inputs: ContractParam[];
  outputs: string[];
}

function typeName(t: { switch: () => { name: string } }): string {
  return t.switch().name.replace(/^scSpecType/, "");
}

export async function loadContractClient(
  contractId: string,
  opts: { publicKey?: string; signTransaction?: (xdr: string) => Promise<string> } = {},
) {
  const { contract } = await import("stellar-sdk");
  return contract.Client.from({
    contractId,
    rpcUrl: SOROBAN_CONFIG.RPC_URL,
    networkPassphrase: SOROBAN_CONFIG.NETWORK_PASSPHRASE,
    allowHttp: SOROBAN_CONFIG.RPC_URL.startsWith("http://"),
    publicKey: opts.publicKey,
    signTransaction: opts.signTransaction
      ? async (xdr: string) => ({ signedTxXdr: await opts.signTransaction!(xdr), signerAddress: opts.publicKey })
      : undefined,
  });
}

type Client = Awaited<ReturnType<typeof loadContractClient>>;

export function listContractMethods(client: Client): ContractMethod[] {
  return client.spec
    .funcs()
    .map((fn) => ({
      name: fn.name().toString(),
      doc: fn.doc().toString(),
      inputs: fn.inputs().map((i) => ({ name: i.name().toString(), type: typeName(i.type()) })),
      outputs: fn.outputs().map(typeName),
    }))
    .filter((m) => !m.name.startsWith("__"));
}

/** Parses a form string into a native JS value for the given spec type. */
export function parseArg(raw: string, type: string): unknown {
  const v = raw.trim();
  if (/^(U|I)(64|128|256)$/.test(type)) return BigInt(v);
  if (/^(U|I)32$/.test(type)) return Number(v);
  if (type === "Bool") return v === "true";
  if (type === "String" || type === "Symbol" || type === "Address") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

export function toPrettyJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}

export interface InvokeResult {
  readOnly: boolean;
  result: unknown;
}

export async function invokeMethod(
  client: Client,
  method: ContractMethod,
  rawArgs: Record<string, string>,
): Promise<InvokeResult> {
  const args = Object.fromEntries(method.inputs.map((p) => [p.name, parseArg(rawArgs[p.name] ?? "", p.type)]));
  const fn = (client as unknown as Record<string, (a?: unknown) => Promise<{
    isReadCall: boolean;
    result: unknown;
    signAndSend: () => Promise<{ result: unknown }>;
  }>>)[method.name];
  const tx = await (method.inputs.length ? fn(args) : fn());
  if (tx.isReadCall) return { readOnly: true, result: tx.result };
  const sent = await tx.signAndSend();
  return { readOnly: false, result: sent.result };
}

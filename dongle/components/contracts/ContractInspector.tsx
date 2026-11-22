"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/context/wallet.context";
import { track } from "@/lib/analytics/client";
import {
  invokeMethod,
  listContractMethods,
  loadContractClient,
  toPrettyJson,
  type ContractMethod,
} from "@/lib/contract-introspection";

type Client = Awaited<ReturnType<typeof loadContractClient>>;

function MethodCard({ method, client, canSign }: { method: ContractMethod; client: Client; canSign: boolean }) {
  const [args, setArgs] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setError(null);
    setOutput(null);
    try {
      const res = await invokeMethod(client, method, args);
      track("contract_method_invoked", { method: method.name, read_only: res.readOnly });
      setOutput(toPrettyJson(res.result));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(!canSign && /sign|publicKey/i.test(msg) ? "This method writes state — connect a wallet to sign." : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
      <summary className="cursor-pointer font-mono text-sm">
        {method.name}({method.inputs.map((i) => `${i.name}: ${i.type}`).join(", ")})
        {method.outputs.length > 0 && <span className="text-zinc-500"> → {method.outputs.join(", ")}</span>}
      </summary>
      {method.doc && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-line">{method.doc}</p>}
      <form
        className="mt-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        {method.inputs.map((p) => (
          <label key={p.name} className="block text-xs">
            {p.name} <span className="text-zinc-500">({p.type})</span>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-1 font-mono text-sm"
              value={args[p.name] ?? ""}
              onChange={(e) => setArgs((a) => ({ ...a, [p.name]: e.target.value }))}
            />
          </label>
        ))}
        <button type="submit" disabled={busy} className="rounded-xl bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
          {busy ? "Running…" : "Try it"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {output !== null && (
        <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-100 dark:bg-zinc-800 p-3 text-xs">{output}</pre>
      )}
    </details>
  );
}

export function ContractInspector({ contractId }: { contractId: string }) {
  const { publicKey, isConnected } = useWallet();
  const [client, setClient] = useState<Client | null>(null);
  const [methods, setMethods] = useState<ContractMethod[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { walletService } = await import("@/services/wallet/wallet.service");
        const { SOROBAN_CONFIG } = await import("@/constants/contracts");
        const c = await loadContractClient(contractId, {
          publicKey: isConnected ? publicKey ?? undefined : undefined,
          signTransaction: isConnected
            ? (xdr) => walletService.signTransaction(xdr, SOROBAN_CONFIG.NETWORK_PASSPHRASE)
            : undefined,
        });
        if (!active) return;
        setClient(c);
        setMethods(listContractMethods(c));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load contract metadata");
      }
    })();
    return () => {
      active = false;
    };
  }, [contractId, publicKey, isConnected]);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!client) return <p className="text-sm text-zinc-500">Loading contract metadata…</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        {methods.length} method{methods.length === 1 ? "" : "s"}. Read-only methods run via simulation without a wallet;
        write methods require a wallet signature.
      </p>
      {methods.map((m) => (
        <MethodCard key={m.name} method={m} client={client} canSign={isConnected} />
      ))}
    </div>
  );
}

export default ContractInspector;

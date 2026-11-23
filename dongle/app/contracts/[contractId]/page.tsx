import { notFound } from "next/navigation";
import { ContractInspector } from "@/components/contracts/ContractInspector";

export default async function ContractPage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  if (!/^C[A-Z2-7]{55}$/.test(contractId)) notFound();

  return (
    <div className="min-h-screen pt-32 pb-24">
      <div className="container mx-auto max-w-3xl px-4">
        <h1 className="text-2xl font-bold mb-1">Contract</h1>
        <p className="font-mono text-xs text-zinc-500 break-all mb-6">{contractId}</p>
        <ContractInspector contractId={contractId} />
      </div>
    </div>
  );
}

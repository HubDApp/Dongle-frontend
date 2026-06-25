\"use client\";

import React, { useState, useEffect } from \"react\";
import { useParams, useRouter } from \"next/navigation\";
import ProjectForm from \"@/components/projects/ProjectForm\";
import { sorobanService, ProjectData } from \"@/services/stellar/soroban.service\";
import { toast } from \"sonner\";
import { AlertTriangle, ArrowLeft } from \"lucide-react\";
import { Button } from \"@/components/ui/Button\";
import { Card } from \"@/components/ui/Card\";
import WalletStatePanel, {
  WalletStateLoadingPanel,
} from \"@/components/wallet/WalletStatePanel\";
import { useWalletPageGate } from \"@/hooks/useWalletPageGate\";

const EDIT_PURPOSE =
  \"Connect Freighter to edit and update your project on-chain.\";

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const gate = useWalletPageGate();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only fetch project once the wallet is ready — avoids a silent skeleton→error
  // when the user is disconnected.
  useEffect(() => {
    if (gate.state !== "ready") return;

    let active = true;

    const fetchProject = async () => {
      try {
        const projectData = await sorobanService.getProject(projectId);
        if (!active) return;
        if (!projectData) {
          setError("Project not found");
          return;
        }
        setProject(projectData);
      } catch (err) {
        if (!active) return;
        console.error("Error fetching data:", err);
        setError("Failed to load project data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchProject();

    return () => {
      active = false;
    };
  }, [projectId, gate.state]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdate = async (data: any) => {
    if (!project) return;
    const promise = sorobanService.updateProject(projectId, data);
    toast.promise(promise, {
      loading: \"Updating your project on-chain...\",
      success: (res) => {
        setTimeout(() => router.push(`/projects/${projectId}`), 2000);
        return `Project updated successfully! Tx: ${res.hash.substring(0, 8)}...`;
      },
      error: (err) => `Update failed: ${err.message}`,
    });
  };

  const pageClass = \"min-h-screen pt-8 pb-24 bg-zinc-50 dark:bg-zinc-950\";

  // Wallet gate — show before attempting any project fetch
  if (gate.state !== \"ready\") {
    return (
      <main className={pageClass}>
        <div className=\"container mx-auto px-4\">
          <div className=\"max-w-xl mx-auto animate-fade-in\">
            {gate.state === \"account-loading\" ? (
              <WalletStateLoadingPanel message=\"Verifying your wallet...\" />
            ) : (
              <WalletStatePanel
                state={gate.state}
                pagePurpose={EDIT_PURPOSE}
                walletNetworkLabel={gate.walletNetworkLabel}
                publicKey={gate.publicKey}
                onConnect={gate.connectWallet}
                onDisconnect={gate.disconnectWallet}
              />
            )}
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className={pageClass}>
        <div className=\"container mx-auto px-4\">
          <div className=\"max-w-2xl mx-auto animate-pulse space-y-4\">
            <div className=\"h-8 bg-zinc-200 dark:bg-zinc-800 rounded\" />
            <div className=\"h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3\" />
            <div className=\"h-12 bg-zinc-200 dark:bg-zinc-800 rounded\" />
            <div className=\"h-12 bg-zinc-200 dark:bg-zinc-800 rounded\" />
            <div className=\"h-24 bg-zinc-200 dark:bg-zinc-800 rounded\" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className={pageClass}>
        <div className=\"container mx-auto px-4\">
          <Card className=\"max-w-2xl mx-auto p-8 text-center\">
            <AlertTriangle className=\"w-12 h-12 text-red-500 mx-auto mb-4\" />
            <h2 className=\"text-2xl font-bold mb-2\">{error ? \"Error\" : \"Project Not Found\"}</h2>
            <p className=\"text-zinc-600 dark:text-zinc-400 mb-6\">
              {error ?? \"The project you're trying to edit doesn't exist.\"}
            </p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className=\"w-4 h-4 mr-2\" />
              Go Back
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  if (gate.publicKey && project.owner !== gate.publicKey) {
    return (
      <main className={pageClass}>
        <div className=\"container mx-auto px-4\">
          <Card className=\"max-w-2xl mx-auto p-8 text-center\">
            <AlertTriangle className=\"w-12 h-12 text-red-500 mx-auto mb-4\" />
            <h2 className=\"text-2xl font-bold mb-2\">Access Denied</h2>
            <p className=\"text-zinc-600 dark:text-zinc-400 mb-6\">
              Only the project owner can edit this project.
            </p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className=\"w-4 h-4 mr-2\" />
              Go Back
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className={pageClass}>
      <div className=\"container mx-auto px-4\">
        <ProjectForm
          mode=\"edit\"
          initialData={{
            name: project.name,
            category: project.category,
            description: project.description,
            websiteUrl: project.websiteUrl,
            githubUrl: project.githubUrl,
            logoUrl: project.logoUrl,
            docsUrl: project.docsUrl,
          }}
          projectId={projectId}
          onSubmit={handleUpdate}
        />
      </div>
    </main>
  );
}

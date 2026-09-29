"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { sorobanService } from "@/services/stellar/soroban.service";
import { Loader2, Search, CheckCircle2, Clock, XCircle, AlertCircle, HelpCircle } from "lucide-react";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

type Status = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

interface VerificationStatusProps {
  initialProjectId?: string;
}

type LookupState = {
  status: Status;
  projectExists: boolean;
  requestExists: boolean;
  rejectionReason?: string;
};

export default function VerificationStatus({ initialProjectId }: VerificationStatusProps) {
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [searchInput, setSearchInput] = useState(initialProjectId ?? "");
  const [lookup, setLookup] = useState<LookupState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = React.useRef(true);

  const fetchStatus = async (id: string, signal?: AbortSignal) => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await sorobanService.getVerificationRequestStatus(id, signal);
      if (!isMountedRef.current) return;
      setLookup({
        status: result.status,
        projectExists: result.projectExists,
        requestExists: result.requestExists,
        rejectionReason: result.rejectionReason,
      });
    } catch (err) {
      if (!isMountedRef.current) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Failed to check verification status";
      console.error(err);
      setError(msg);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  React.useEffect(() => {
    isMountedRef.current = true;
    const controller = new AbortController();
    if (initialProjectId) {
      void fetchStatus(initialProjectId, controller.signal);
    }
    return () => {
      isMountedRef.current = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setProjectId(searchInput);
    void fetchStatus(searchInput);
  };

  const resolveDisplay = (): {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
    badge: "outline" | "warning" | "success" | "error";
    badgeLabel: string;
  } => {
    if (!lookup) {
      return {
        icon: <HelpCircle className="w-12 h-12 text-zinc-400" />,
        title: "Search",
        description: "Enter a project ID to check verification status.",
        color: "border-zinc-200 dark:border-zinc-800",
        badge: "outline",
        badgeLabel: "NONE",
      };
    }

    if (!lookup.projectExists) {
      return {
        icon: <HelpCircle className="w-12 h-12 text-zinc-400" />,
        title: "Project Not Found",
        description: "This project ID is not registered in the directory.",
        color: "border-zinc-200 dark:border-zinc-800",
        badge: "outline",
        badgeLabel: "UNKNOWN",
      };
    }

    if (!lookup.requestExists) {
      return {
        icon: <AlertCircle className="w-12 h-12 text-zinc-400" />,
        title: "No Verification Request",
        description: "This project exists but has not submitted a verification request.",
        color: "border-zinc-200 dark:border-zinc-800",
        badge: "outline",
        badgeLabel: "NONE",
      };
    }

    const statusConfig = {
      PENDING: {
        icon: <Clock className="w-12 h-12 text-yellow-500" />,
        title: "Pending Review",
        description: "The verification request is currently being reviewed by the community.",
        color: "border-yellow-500/50 bg-yellow-500/5",
        badge: "warning" as const,
      },
      VERIFIED: {
        icon: <CheckCircle2 className="w-12 h-12 text-green-500" />,
        title: "Verified",
        description: "This project has been verified and is considered trustworthy.",
        color: "border-green-500/50 bg-green-500/5",
        badge: "success" as const,
      },
      REJECTED: {
        icon: <XCircle className="w-12 h-12 text-red-500" />,
        title: "Rejected",
        description: lookup.rejectionReason
          ? `Verification was rejected: ${lookup.rejectionReason}`
          : "The verification request for this project was rejected.",
        color: "border-red-500/50 bg-red-500/5",
        badge: "error" as const,
      },
      NONE: {
        icon: <AlertCircle className="w-12 h-12 text-zinc-400" />,
        title: "No Verification Request",
        description: "This project exists but has not submitted a verification request.",
        color: "border-zinc-200 dark:border-zinc-800",
        badge: "outline" as const,
      },
    };

    const config = statusConfig[lookup.status];
    return { ...config, badgeLabel: lookup.status };
  };

  const display = resolveDisplay();

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 animate-fade-in">
      <Card variant="outline" padding="md">
        <form onSubmit={handleSearch} className="flex gap-2">
          <FormField
            label=""
            placeholder="Enter Project ID to check status"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" className="mt-1" isLoading={isLoading} aria-label="Search verification status">
            <Search className="w-4 h-4" />
          </Button>
        </form>
      </Card>

      {projectId && error && (
        <Card className="transition-all duration-300 border-2 border-red-500/50 bg-red-500/5" padding="lg">
          <div className="flex flex-col items-center text-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <h3 className="text-xl font-bold">Check Failed</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchStatus(projectId)}
              isLoading={isLoading}
            >
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {projectId && !error && (
        <Card className={`transition-all duration-300 border-2 ${display.color}`} padding="lg">
          <div className="flex flex-col items-center text-center gap-4">
            {isLoading ? (
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            ) : (
              display.icon
            )}

            {!isLoading && (
              <>
                <Badge variant={display.badge}>{display.badgeLabel}</Badge>
                <h3 className="text-xl font-bold">{display.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  {display.description}
                </p>
                <div className="mt-4 p-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-full">
                  <p className="text-xs font-mono text-zinc-500 truncate">
                    ID: {projectId}
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

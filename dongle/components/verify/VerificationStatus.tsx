"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { sorobanService } from "@/services/stellar/soroban.service";
import { Loader2, Search, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

type Status = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

interface VerificationStatusProps {
  initialProjectId?: string;
}

export default function VerificationStatus({ initialProjectId }: VerificationStatusProps) {
  const [projectId, setProjectId] = useState(initialProjectId || "");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<Status>("NONE");
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async (id: string) => {
    if (!id) return;
    setIsLoading(true);
    try {
      const result = await sorobanService.getVerificationStatus(id);
      setStatus(result);
    } catch (error) {
      console.error(error);
      setStatus("NONE");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialProjectId) {
      setProjectId(initialProjectId);
      setSearchInput(initialProjectId);
      fetchStatus(initialProjectId);
    }
  }, [initialProjectId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setProjectId(searchInput);
    fetchStatus(searchInput);
  };

  const statusConfig = {
    NONE: {
      icon: <AlertCircle className="w-12 h-12 text-zinc-400" />,
      title: "Not Found",
      description: "No verification request found for this project.",
      color: "border-zinc-200 dark:border-zinc-800",
      badge: "outline" as const
    },
    PENDING: {
      icon: <Clock className="w-12 h-12 text-yellow-500" />,
      title: "Pending Review",
      description: "The verification request is currently being reviewed by the community.",
      color: "border-yellow-500/50 bg-yellow-500/5",
      badge: "warning" as const
    },
    VERIFIED: {
      icon: <CheckCircle2 className="w-12 h-12 text-green-500" />,
      title: "Verified",
      description: "This project has been verified and is considered trustworthy.",
      color: "border-green-500/50 bg-green-500/5",
      badge: "success" as const
    },
    REJECTED: {
      icon: <XCircle className="w-12 h-12 text-red-500" />,
      title: "Rejected",
      description: "The verification request for this project was rejected.",
      color: "border-red-500/50 bg-red-500/5",
      badge: "error" as const
    }
  };

  const config = statusConfig[status];

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
          <Button type="submit" variant="secondary" className="mt-1" isLoading={isLoading}>
            <Search className="w-4 h-4" />
          </Button>
        </form>
      </Card>

      {projectId && (
        <Card className={`transition-all duration-300 border-2 ${config.color}`} padding="lg">
          <div className="flex flex-col items-center text-center gap-4">
            {isLoading ? (
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            ) : (
              config.icon
            )}
            
            {!isLoading && (
              <>
                <Badge variant={config.badge}>{status}</Badge>
                <h3 className="text-xl font-bold">{config.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  {config.description}
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

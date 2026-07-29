"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface AddressDisplayProps {
  address: string;
  copyable?: boolean;
  truncated?: boolean;
  className?: string;
  inline?: boolean;
}

export default function AddressDisplay({
  address,
  copyable = true,
  truncated = true,
  className = "",
  inline = false,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  if (!address) return null;

  const displayAddress = truncated
    ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
    : address;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast.error("Failed to copy address.");
    }
  };

  const content = (
    <span
      className={`font-mono text-xs text-zinc-600 dark:text-zinc-400 select-all ${className}`}
      title={address}
    >
      {displayAddress}
    </span>
  );

  if (!copyable) {
    return content;
  }

  if (inline) {
    return (
      <span className="inline-flex items-center gap-1.5 group">
        {content}
        <button
          onClick={handleCopy}
          aria-label="Copy address"
          title="Copy address"
          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 transition-colors max-w-fit">
      {content}
      <button
        onClick={handleCopy}
        aria-label="Copy address"
        title="Copy address"
        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-500" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}

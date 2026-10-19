"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ShieldCheck,
  Clock,
  ShieldX,
  ShieldAlert,
  Eye,
  Save,
} from "lucide-react";

/**
 * BadgeCustomizer — allows verified projects to customize how their
 * verification badge appears (#692).
 */

export type BadgeStyle = "minimal" | "standard" | "detailed";
export type BadgePlacement = "top-left" | "top-right" | "header";

interface BadgeCustomizerProps {
  currentSettings?: BadgeSettings;
  onSave?: (settings: BadgeSettings) => void;
  tierName?: string;
}

export interface BadgeSettings {
  style: BadgeStyle;
  placement: BadgePlacement;
  showTierName: boolean;
  linkToDetails: boolean;
}

const defaultSettings: BadgeSettings = {
  style: "standard",
  placement: "top-right",
  showTierName: true,
  linkToDetails: true,
};

export function BadgeCustomizer({
  currentSettings,
  onSave,
  tierName = "Verified",
}: BadgeCustomizerProps) {
  const [settings, setSettings] = useState<BadgeSettings>(
    currentSettings ?? defaultSettings,
  );
  const [preview, setPreview] = useState(false);

  const handleSave = () => {
    onSave?.(settings);
  };

  return (
    <div className="space-y-6 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Badge Display Settings</h3>
        <Button variant="outline" size="sm" onClick={() => setPreview(!preview)}>
          <Eye className="h-4 w-4 mr-2" />
          {preview ? "Hide Preview" : "Preview"}
        </Button>
      </div>

      {/* Preview */}
      {preview && (
        <div className="relative rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-center text-sm text-zinc-500 mb-4">
            Project Header Preview
          </div>
          <div
            className={`absolute ${
              settings.placement === "top-left"
                ? "top-4 left-4"
                : settings.placement === "top-right"
                  ? "top-4 right-4"
                  : "top-0 left-1/2 -translate-x-1/2"
            }`}
          >
            <BadgePreview settings={settings} tierName={tierName} />
          </div>
          <div className="h-20" />
        </div>
      )}

      {/* Style options */}
      <div>
        <label className="block text-sm font-medium mb-2">Badge Style</label>
        <div className="grid grid-cols-3 gap-3">
          {(["minimal", "standard", "detailed"] as BadgeStyle[]).map((style) => (
            <button
              key={style}
              onClick={() => setSettings({ ...settings, style })}
              className={`rounded-lg border p-3 text-center text-sm capitalize transition-colors ${
                settings.style === style
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Placement options */}
      <div>
        <label className="block text-sm font-medium mb-2">Badge Placement</label>
        <div className="grid grid-cols-3 gap-3">
          {(["top-left", "top-right", "header"] as BadgePlacement[]).map((placement) => (
            <button
              key={placement}
              onClick={() => setSettings({ ...settings, placement })}
              className={`rounded-lg border p-3 text-center text-sm capitalize transition-colors ${
                settings.placement === placement
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {placement.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle options */}
      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.showTierName}
            onChange={(e) => setSettings({ ...settings, showTierName: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm">Show verification tier name</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.linkToDetails}
            onChange={(e) => setSettings({ ...settings, linkToDetails: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm">Link badge to verification details page</span>
        </label>
      </div>

      <Button onClick={handleSave} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        Save Badge Settings
      </Button>
    </div>
  );
}

function BadgePreview({
  settings,
  tierName,
}: {
  settings: BadgeSettings;
  tierName: string;
}) {
  const Icon = ShieldCheck;

  if (settings.style === "minimal") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-green-700 dark:bg-green-900/20">
        <Icon className="h-4 w-4" />
      </span>
    );
  }

  if (settings.style === "detailed") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-900/10">
        <Icon className="h-5 w-5 text-green-600" />
        <div>
          <p className="text-xs font-medium text-green-700 dark:text-green-400">
            {settings.showTierName ? tierName : "Verified"}
          </p>
          <p className="text-xs text-green-600 dark:text-green-500">
            Audited & Verified
          </p>
        </div>
      </div>
    );
  }

  // Standard
  return (
    <Badge variant="success" className="gap-1">
      <Icon className="h-3 w-3" />
      {settings.showTierName ? tierName : "Verified"}
    </Badge>
  );
}

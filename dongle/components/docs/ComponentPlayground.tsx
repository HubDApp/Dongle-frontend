"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Search } from "lucide-react";
import {
  Badge,
  type BadgeVariant,
} from "@/components/ui/Badge";
import {
  Button,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/Button";
import {
  Card,
  type CardPadding,
  type CardVariant,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type Tab = "button" | "card" | "badge" | "input";

const TABS: { id: Tab; label: string }[] = [
  { id: "button", label: "Button" },
  { id: "card", label: "Card" },
  { id: "badge", label: "Badge" },
  { id: "input", label: "Input" },
];

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
      {label}
      {children}
    </label>
  );
}

const selectClass =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100";

export default function ComponentPlayground() {
  const [tab, setTab] = useState<Tab>("button");

  const [buttonVariant, setButtonVariant] = useState<ButtonVariant>("primary");
  const [buttonSize, setButtonSize] = useState<ButtonSize>("md");
  const [buttonLabel, setButtonLabel] = useState("Submit project");
  const [buttonLoading, setButtonLoading] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [buttonIcons, setButtonIcons] = useState(false);

  const [cardVariant, setCardVariant] = useState<CardVariant>("default");
  const [cardPadding, setCardPadding] = useState<CardPadding>("md");

  const [badgeVariant, setBadgeVariant] = useState<BadgeVariant>("success");
  const [badgeLabel, setBadgeLabel] = useState("Verified");

  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [inputPlaceholder, setInputPlaceholder] = useState("Project name");

  const snippet = useMemo(() => {
    switch (tab) {
      case "button":
        return `<Button variant="${buttonVariant}" size="${buttonSize}"${buttonLoading ? " isLoading" : ""}${buttonDisabled ? " disabled" : ""}>\n  ${buttonLabel}\n</Button>`;
      case "card":
        return `<Card variant="${cardVariant}" padding="${cardPadding}">\n  …\n</Card>`;
      case "badge":
        return `<Badge variant="${badgeVariant}">${badgeLabel}</Badge>`;
      case "input":
        return `<Input aria-label="${inputPlaceholder}"${inputError ? " error aria-invalid" : ""}${inputDisabled ? " disabled" : ""} />`;
    }
  }, [
    tab,
    buttonVariant,
    buttonSize,
    buttonLabel,
    buttonLoading,
    buttonDisabled,
    cardVariant,
    cardPadding,
    badgeVariant,
    badgeLabel,
    inputPlaceholder,
    inputError,
    inputDisabled,
  ]);

  return (
    <div className="space-y-10">
      <div
        role="tablist"
        aria-label="Component"
        className="flex flex-wrap gap-2"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === item.id
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card variant="outline" className="flex min-h-[220px] items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          {tab === "button" && (
            <Button
              variant={buttonVariant}
              size={buttonSize}
              isLoading={buttonLoading}
              disabled={buttonDisabled}
              leftIcon={
                buttonIcons ? (
                  <Search className="h-4 w-4" aria-hidden="true" />
                ) : undefined
              }
              rightIcon={
                buttonIcons ? (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                ) : undefined
              }
            >
              {buttonLabel}
            </Button>
          )}
          {tab === "card" && (
            <Card variant={cardVariant} padding={cardPadding} className="w-72">
              <h3 className="text-lg font-semibold">Soroban Swap</h3>
              <p className="mt-2 text-sm text-zinc-500">
                Preview of the {cardVariant} surface with {cardPadding} padding.
              </p>
            </Card>
          )}
          {tab === "badge" && <Badge variant={badgeVariant}>{badgeLabel}</Badge>}
          {tab === "input" && (
            <div className="w-80">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={inputPlaceholder}
                error={inputError}
                disabled={inputDisabled}
                aria-label={inputPlaceholder}
                aria-invalid={inputError || undefined}
                aria-describedby={inputError ? "playground-input-error" : undefined}
              />
              {inputError && (
                <p
                  id="playground-input-error"
                  className="mt-2 text-xs text-red-500"
                  role="alert"
                >
                  This field has an error.
                </p>
              )}
            </div>
          )}
        </Card>

        <Card padding="sm" className="space-y-3">
          <p className="text-sm font-semibold">Controls</p>
          {tab === "button" && (
            <>
              <Field label="variant">
                <select
                  className={selectClass}
                  value={buttonVariant}
                  onChange={(e) =>
                    setButtonVariant(e.target.value as ButtonVariant)
                  }
                >
                  {["primary", "secondary", "outline", "ghost", "error"].map(
                    (v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="size">
                <select
                  className={selectClass}
                  value={buttonSize}
                  onChange={(e) => setButtonSize(e.target.value as ButtonSize)}
                >
                  {["sm", "md", "lg"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="children">
                <Input
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  aria-label="Button label"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={buttonLoading}
                  onChange={(e) => setButtonLoading(e.target.checked)}
                />
                isLoading
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={buttonDisabled}
                  onChange={(e) => setButtonDisabled(e.target.checked)}
                />
                disabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={buttonIcons}
                  onChange={(e) => setButtonIcons(e.target.checked)}
                />
                icons
              </label>
            </>
          )}
          {tab === "card" && (
            <>
              <Field label="variant">
                <select
                  className={selectClass}
                  value={cardVariant}
                  onChange={(e) =>
                    setCardVariant(e.target.value as CardVariant)
                  }
                >
                  {["default", "glass", "outline"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="padding">
                <select
                  className={selectClass}
                  value={cardPadding}
                  onChange={(e) =>
                    setCardPadding(e.target.value as CardPadding)
                  }
                >
                  {["none", "sm", "md", "lg"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {tab === "badge" && (
            <>
              <Field label="variant">
                <select
                  className={selectClass}
                  value={badgeVariant}
                  onChange={(e) =>
                    setBadgeVariant(e.target.value as BadgeVariant)
                  }
                >
                  {[
                    "primary",
                    "secondary",
                    "success",
                    "warning",
                    "error",
                    "outline",
                  ].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="children">
                <Input
                  value={badgeLabel}
                  onChange={(e) => setBadgeLabel(e.target.value)}
                  aria-label="Badge label"
                />
              </Field>
            </>
          )}
          {tab === "input" && (
            <>
              <Field label="placeholder">
                <Input
                  value={inputPlaceholder}
                  onChange={(e) => setInputPlaceholder(e.target.value)}
                  aria-label="Placeholder text"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={inputError}
                  onChange={(e) => setInputError(e.target.checked)}
                />
                error
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={inputDisabled}
                  onChange={(e) => setInputDisabled(e.target.checked)}
                />
                disabled
              </label>
            </>
          )}
        </Card>
      </div>

      <pre className="overflow-x-auto rounded-2xl bg-zinc-950 p-4 text-sm text-zinc-100">
        <code>{snippet}</code>
      </pre>
    </div>
  );
}

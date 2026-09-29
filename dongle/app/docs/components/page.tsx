import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import ComponentPlayground from "@/components/docs/ComponentPlayground";

export const metadata = {
  title: "UI components | Dongle",
  description: "Button, Card, Badge, and Input variants, props, and playground.",
};

function VariantRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

export default function ComponentDocsPage() {
  return (
    <main className="min-h-screen bg-white pt-32 pb-24 dark:bg-black">
      <div className="container mx-auto max-w-4xl space-y-16 px-4">
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wider text-blue-500">
            Component docs
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Button, Card, Badge, Input
          </h1>
          <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
            Live examples for every variant, an interactive playground, and the
            accessibility props each primitive accepts. Full write-up:{" "}
            <Link className="underline" href="/docs">
              product docs
            </Link>
            . Source-of-truth markdown lives in{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              docs/components.md
            </code>
            .
          </p>
        </header>

        <section className="space-y-4" aria-labelledby="playground-heading">
          <h2 id="playground-heading" className="text-2xl font-semibold">
            Interactive playground
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Change props and watch the preview update. Equivalent to Storybook
            Controls.
          </p>
          <ComponentPlayground />
        </section>

        <section className="space-y-6" aria-labelledby="button-heading">
          <h2 id="button-heading" className="text-2xl font-semibold">
            Button variants
          </h2>
          <VariantRow>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="error">Error</Button>
          </VariantRow>
          <VariantRow>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button isLoading loadingText="Saving…">
              Save
            </Button>
          </VariantRow>
        </section>

        <section className="space-y-6" aria-labelledby="card-heading">
          <h2 id="card-heading" className="text-2xl font-semibold">
            Card variants
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card variant="default">Default</Card>
            <Card variant="glass">Glass</Card>
            <Card variant="outline">Outline</Card>
          </div>
        </section>

        <section className="space-y-6" aria-labelledby="badge-heading">
          <h2 id="badge-heading" className="text-2xl font-semibold">
            Badge variants
          </h2>
          <VariantRow>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Verified</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="error">Rejected</Badge>
            <Badge variant="outline">Draft</Badge>
          </VariantRow>
        </section>

        <section className="space-y-6" aria-labelledby="input-heading">
          <h2 id="input-heading" className="text-2xl font-semibold">
            Input variants
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Input aria-label="Default input" placeholder="Default" />
            <Input
              aria-label="Invalid input"
              error
              aria-invalid
              defaultValue="not-a-url"
            />
            <Input aria-label="Disabled input" disabled placeholder="Disabled" />
            <Input aria-label="Search input" type="search" placeholder="Search" />
          </div>
        </section>
      </div>
    </main>
  );
}

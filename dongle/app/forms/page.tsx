"use client";

import { Suspense } from "react";
import { DynamicFormBuilder } from "@/components/forms/DynamicFormBuilder";

export default function FormsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent pt-28 pb-20">
      <div className="container mx-auto px-4">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <DynamicFormBuilder />
        </Suspense>
      </div>
    </main>
  );
}

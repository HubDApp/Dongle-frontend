"use client";

import { Suspense } from "react";
import { FormConfirmationView } from "@/components/forms/FormConfirmationView";

export default function FormConfirmationRoute() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pt-28 pb-20">
      <div className="container mx-auto px-4">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <FormConfirmationView />
        </Suspense>
      </div>
    </main>
  );
}

/**
 * Registry of schemas the docs generator covers (Issue #581).
 *
 * Explicit rather than discovered by globbing the filesystem. A glob picks up
 * every `z.object` in the tree — including ad-hoc ones inside components and
 * test fixtures — and the output becomes noise nobody reads. Adding a schema
 * here is one line, and the choice to document it stays deliberate.
 */

import { reviewFormSchema } from "./review.schema";
import type { z } from "zod";

export interface RegisteredSchema {
  /** Heading in the generated document. */
  name: string;
  schema: z.ZodType;
  description?: string;
}

export const DOCUMENTED_SCHEMAS: RegisteredSchema[] = [
  {
    name: "Review form",
    schema: reviewFormSchema,
    description:
      "Submitted when a user reviews a project. Validated client-side before submission and re-validated server-side.",
  },
];

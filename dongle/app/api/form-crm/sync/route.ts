/**
 * POST /api/form-crm/sync
 * Sync a form submission to configured CRM providers.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  syncFormSubmissionToCrm,
  type CrmProviderConfig,
} from "@/services/form-crm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formType, submissionId, data, email, providers } = body ?? {};

    if (!formType || !submissionId || !data || typeof data !== "object") {
      return NextResponse.json(
        { error: "formType, submissionId, and data are required" },
        { status: 400 },
      );
    }

    const result = await syncFormSubmissionToCrm(
      { formType, submissionId, data, email },
      {
        providers: providers as CrmProviderConfig[] | undefined,
      },
    );

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "CRM sync failed",
      },
      { status: 500 },
    );
  }
}

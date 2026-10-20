/**
 * /api/admin/sns/verify
 *
 * Admin verification of SNS domain ownership (Issue #727).
 *
 * POST { domain, address, note? } → records the domain → address ownership.
 * GET  ?domain=…                  → returns the existing record, if any.
 */

import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-guard";
import {
  getOwnershipRecord,
  verifyDomainOwnership,
} from "@/services/sns";
import { isValidSnsDomain, normalizeSnsDomain } from "@/types/sns";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const domain = new URL(request.url).searchParams.get("domain");
  if (!domain) {
    return NextResponse.json({ error: "Missing domain" }, { status: 400 });
  }
  const record = getOwnershipRecord(domain);
  return NextResponse.json({ verified: record !== null, record });
}

export async function POST(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  let body: { domain?: string; address?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { domain, address, note } = body;
  if (!domain || !address) {
    return NextResponse.json({ error: "Missing domain or address" }, { status: 400 });
  }

  if (!isValidSnsDomain(domain)) {
    return NextResponse.json(
      { error: "Invalid SNS domain (expected e.g. name.stellar)" },
      { status: 400 },
    );
  }

  if (!/^G[A-Z2-7]{55}$/.test(address)) {
    return NextResponse.json({ error: "Invalid Stellar address" }, { status: 400 });
  }

  const record = verifyDomainOwnership({
    domain: normalizeSnsDomain(domain),
    address,
    verifiedBy: admin.publicKey,
    note,
  });

  return NextResponse.json({ verified: true, record });
}

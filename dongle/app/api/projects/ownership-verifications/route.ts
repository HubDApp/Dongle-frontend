import { NextResponse } from "next/server";
import {
  checkOwnershipVerification,
  createOwnershipVerification,
  listOwnershipVerifications,
  type OwnershipVerificationMethod,
} from "@/services/project/ownership-verification.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function validWallet(address: string | null): address is string {
  return Boolean(address && /^G[A-Z2-7]{55}$/.test(address));
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const projectId = params.get("projectId");
  const walletAddress = params.get("walletAddress");
  if (!projectId || projectId.length > 128 || !validWallet(walletAddress)) {
    return NextResponse.json({ error: "Invalid project or wallet" }, { status: 400 });
  }
  try {
    const verifications = await listOwnershipVerifications(projectId, walletAddress);
    return NextResponse.json({ verifications });
  } catch (error) {
    console.error("[ownership-verifications] list failed", error);
    return NextResponse.json({ error: "Could not load verification status" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: {
    action?: "create" | "check";
    projectId?: string;
    walletAddress?: string;
    method?: OwnershipVerificationMethod;
    target?: string;
    verificationId?: string;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  if (!body.projectId || body.projectId.length > 128 || !validWallet(body.walletAddress ?? null)) {
    return NextResponse.json({ error: "Invalid project or wallet" }, { status: 400 });
  }

  try {
    if (body.action === "check") {
      if (!body.verificationId) return NextResponse.json({ error: "Verification ID is required" }, { status: 400 });
      return NextResponse.json(await checkOwnershipVerification(
        body.verificationId,
        body.projectId,
        body.walletAddress,
      ));
    }
    if (body.action !== "create" || !body.method || !body.target) {
      return NextResponse.json({ error: "Method and target are required" }, { status: 400 });
    }

    const verification = await createOwnershipVerification({
      projectId: body.projectId,
      walletAddress: body.walletAddress,
      method: body.method,
      target: body.target,
    });
    return NextResponse.json({ verification }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
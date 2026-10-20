import { NextRequest, NextResponse } from "next/server";
import { verifyPin, type PinningProvider } from "@/services/ipfs/pinning.service";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";

/**
 * GET /api/ipfs/pins/[cid]?provider=pinata
 * Verifies whether a CID is pinned on the given provider.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { cid: string } },
) {
  try {
    const cid = decodeURIComponent(params.cid);
    const provider = (request.nextUrl.searchParams.get("provider") || "pinata") as PinningProvider;

    const status = await verifyPin(cid, provider);
    return NextResponse.json(createSuccessResponse(status));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Pin verification failed", 500),
      { status: 500 },
    );
  }
}

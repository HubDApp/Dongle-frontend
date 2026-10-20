import { NextRequest, NextResponse } from "next/server";
import {
  pinContent,
  verifyPin,
  listPins,
  unpinContent,
  type PinningProvider,
} from "@/services/ipfs/pinning.service";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";

const ALLOWED_PROVIDERS: PinningProvider[] = ["pinata", "nft-storage", "web3-storage"];

function providerFromQuery(request: NextRequest): PinningProvider | null {
  const provider = request.nextUrl.searchParams.get("provider");
  if (provider && ALLOWED_PROVIDERS.includes(provider as PinningProvider)) {
    return provider as PinningProvider;
  }
  return null;
}

/**
 * POST /api/ipfs/pin
 * Body: { cid, size, provider, fileBuffer? }
 * Pins content to the configured pinning service.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cid, size, provider, fileBuffer } = body;

    if (!cid || typeof size !== "number") {
      return NextResponse.json(
        createErrorResponse(ErrorCode.VALIDATION_ERROR, "cid and size are required", 400),
        { status: 400 },
      );
    }

    const pinProvider = provider || "pinata";
    if (!ALLOWED_PROVIDERS.includes(pinProvider)) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.VALIDATION_ERROR, "Invalid provider", 400),
        { status: 400 },
      );
    }

    const result = await pinContent(cid, size, pinProvider, fileBuffer);
    return NextResponse.json(createSuccessResponse(result), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Pin failed", 500),
      { status: 500 },
    );
  }
}

/**
 * GET /api/ipfs/pins
 * Query: ?provider=pinata
 * Lists all tracked pins with status.
 */
export async function GET(request: NextRequest) {
  try {
    const provider = providerFromQuery(request);
    const pins = listPins().filter((p) => !provider || p.provider === provider);

    // Enrich each pin with live verification status.
    const enriched = await Promise.all(
      pins.map((p) => verifyPin(p.cid, p.provider).then((s) => ({ ...p, pinned: s.pinned, error: s.error }))),
    );

    return NextResponse.json(createSuccessResponse(enriched));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Failed to list pins", 500),
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/ipfs/pins/[cid]
 * Unpins (stops tracking) old/deleted content.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cid = searchParams.get("cid");
    const provider = (searchParams.get("provider") || "pinata") as PinningProvider;

    if (!cid) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.VALIDATION_ERROR, "cid is required", 400),
        { status: 400 },
      );
    }

    const removed = unpinContent(cid);
    return NextResponse.json(createSuccessResponse({ cid, provider, removed }));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Unpin failed", 500),
      { status: 500 },
    );
  }
}

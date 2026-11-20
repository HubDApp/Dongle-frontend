/**
 * API Route: /api/sync/devices
 *
 * Wallet-keyed device management for cross-device sync.
 *
 *   GET    ?walletAddress=G…&deviceId=…   → list enrolled devices
 *   POST   { walletAddress, deviceId, label } → register / heartbeat a device
 *   DELETE ?walletAddress=G…&deviceId=…   → sign out every OTHER device
 *
 * Only opaque metadata (device labels, timestamps) is handled here — never
 * user content. Revoked devices are notified over the SSE stream so they can
 * sign out immediately.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  buildDeviceLabel,
  isValidWalletAddress,
  listSyncDevices,
  publishDeviceRevoked,
  registerSyncDevice,
  revokeOtherSyncDevices,
  type SyncDeviceView,
} from "../store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function invalid(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const walletAddress = searchParams.get("walletAddress");
  const deviceId = searchParams.get("deviceId") ?? undefined;

  if (!isValidWalletAddress(walletAddress)) {
    return invalid("Invalid wallet address");
  }

  const devices: SyncDeviceView[] = listSyncDevices(walletAddress, deviceId);
  return NextResponse.json({ devices });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { walletAddress?: unknown; deviceId?: unknown; label?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return invalid("Invalid JSON body");
  }

  const { walletAddress, deviceId, label } = body;
  if (!isValidWalletAddress(walletAddress)) {
    return invalid("Invalid wallet address");
  }
  if (typeof deviceId !== "string" || deviceId.trim().length === 0) {
    return invalid("Invalid device id");
  }

  const resolvedLabel =
    typeof label === "string" && label.trim()
      ? label
      : buildDeviceLabel(request.headers.get("user-agent") ?? "");

  const device = registerSyncDevice(walletAddress, deviceId.trim(), resolvedLabel);

  return NextResponse.json({
    device: {
      deviceId: device.deviceId,
      label: device.label,
      createdAt: device.createdAt,
      lastSeenAt: device.lastSeenAt,
    },
    devices: listSyncDevices(walletAddress, device.deviceId),
  });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const walletAddress = searchParams.get("walletAddress");
  const deviceId = searchParams.get("deviceId");

  if (!isValidWalletAddress(walletAddress)) {
    return invalid("Invalid wallet address");
  }
  if (!deviceId) {
    return invalid("Missing device id");
  }

  const revoked = revokeOtherSyncDevices(walletAddress, deviceId);
  for (const id of revoked) {
    publishDeviceRevoked(walletAddress, id);
  }

  return NextResponse.json({
    revoked: revoked.length,
    devices: listSyncDevices(walletAddress, deviceId),
  });
}

/**
 * API Route: GET /api/sync/stream?walletAddress=G…&deviceId=…
 *
 * Server-Sent Events stream carrying real-time sync signals for a wallet.
 *
 * Each enrolled device opens one stream. When any device uploads a new backup
 * revision, every other device subscribed to the same wallet receives a
 * `sync` event with the new revision, prompting it to pull and reconcile.
 *
 * The stream itself never carries user content — only opaque metadata
 * (revision, timestamps, device ids). It mirrors the transport already used by
 * `app/api/notifications/stream/route.ts` (SSE, since Next.js API routes
 * cannot upgrade to a raw WebSocket in this deployment).
 *
 * Events:
 *   event: ready → { revision, devices, label }   (sent on connect)
 *   event: sync  → SyncEvent                        (revision / device-revoked)
 */

import { NextRequest } from "next/server";
import {
  buildDeviceLabel,
  getRevision,
  isValidWalletAddress,
  listSyncDevices,
  registerSyncDevice,
  subscribeSync,
  touchSyncDevice,
  type SyncEvent,
} from "../store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 15000;

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl;
  const walletAddress = searchParams.get("walletAddress");
  const deviceId = searchParams.get("deviceId");

  if (!isValidWalletAddress(walletAddress) || !deviceId) {
    return new Response("Invalid wallet address or device id", { status: 400 });
  }

  const label = buildDeviceLabel(request.headers.get("user-agent") ?? "");
  const device = registerSyncDevice(walletAddress, deviceId, label);

  const encoder = new TextEncoder();
  let unsubscribe: () => void = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          if (heartbeat) clearInterval(heartbeat);
        }
      };

      const send = (event: SyncEvent) => {
        enqueue(`id: ${event.id}\n`);
        enqueue(`event: sync\n`);
        enqueue(`data: ${JSON.stringify(event)}\n\n`);
      };

      unsubscribe = subscribeSync(walletAddress, send);

      // Hand the client a snapshot so it can reconcile on (re)connect.
      const ready = {
        revision: getRevision(walletAddress),
        devices: listSyncDevices(walletAddress, deviceId),
        label: device.label,
      };
      enqueue(`event: ready\ndata: ${JSON.stringify(ready)}\n\n`);

      heartbeat = setInterval(() => {
        touchSyncDevice(walletAddress, deviceId);
        enqueue(`: ping\n\n`);
      }, HEARTBEAT_MS);
    },
    cancel() {
      unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

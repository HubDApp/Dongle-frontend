/**
 * GET /api/events/contract-upgrades
 *
 * Issue #879 – SSE stream for contract upgrade notifications.
 *
 * Clients subscribe once and receive a push whenever the upgrade-monitor
 * detects a WASM hash change.  Clients flagged as incompatible should perform
 * a hard reload on receiving `breakingChange: true`.
 *
 *   const es = new EventSource('/api/events/contract-upgrades');
 *   es.onmessage = ({ data }) => {
 *     const ev = JSON.parse(data);
 *     if (ev.type === 'ContractUpgraded' && ev.breakingChange) {
 *       window.location.reload();
 *     }
 *   };
 */

import { type NextRequest } from "next/server";
import {
  subscribeToUpgradeNotifications,
  type UpgradeNotification,
} from "@/services/stellar/contract-upgrade-monitor.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let unsub: (() => void) | undefined;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const push = (payload: UpgradeNotification | { type: string }) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      // Send initial connected event.
      push({ type: "connected" });

      // Subscribe to future upgrade broadcasts.
      unsub = subscribeToUpgradeNotifications((notification) => push(notification));

      // Heartbeat every 30 s.
      const heartbeat = setInterval(() => {
        push({ type: "heartbeat" });
      }, 30_000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        unsub?.();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
    cancel() {
      closed = true;
      unsub?.();
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

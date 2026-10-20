/**
 * GET /api/reviews/[id]/comments/stream — Issue #654
 *
 * Server-Sent Events (SSE) endpoint that pushes new comment notifications
 * to connected clients in real time.
 *
 * Clients connect and receive:
 *   event: comment
 *   data: <JSON ReviewComment>
 *
 * The server pings every 25 s to keep the connection alive through proxies.
 */

import { NextRequest } from "next/server";

// ─── Simple pub/sub for the in-process SSE broadcast ─────────────────────────

type Listener = (comment: unknown) => void;
const listeners = new Map<string, Set<Listener>>();

export function broadcastComment(reviewId: string, comment: unknown) {
  const set = listeners.get(reviewId);
  if (!set) return;
  for (const fn of set) {
    fn(comment);
  }
}

function subscribe(reviewId: string, fn: Listener) {
  if (!listeners.has(reviewId)) {
    listeners.set(reviewId, new Set());
  }
  listeners.get(reviewId)!.add(fn);
}

function unsubscribe(reviewId: string, fn: Listener) {
  listeners.get(reviewId)?.delete(fn);
  if (listeners.get(reviewId)?.size === 0) {
    listeners.delete(reviewId);
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: reviewId } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection confirmation
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Push new comments to this client
      const listener: Listener = (comment) => {
        controller.enqueue(
          encoder.encode(`event: comment\ndata: ${JSON.stringify(comment)}\n\n`),
        );
      };

      subscribe(reviewId, listener);

      // Heartbeat — every 25 s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // Stream was closed
          clearInterval(heartbeat);
          unsubscribe(reviewId, listener);
        }
      }, 25_000);

      // Clean up when the client disconnects
      return () => {
        clearInterval(heartbeat);
        unsubscribe(reviewId, listener);
      };
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

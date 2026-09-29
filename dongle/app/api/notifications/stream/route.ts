import { getSession } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { subscribeNotifications } from "@/lib/notifications/server-store";
import { RECIPIENT_COOKIE } from "@/lib/notifications/constants";
import type { NotificationStreamEvent } from "@/types/notification";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  const jar = await cookies();
  const recipient = session?.sub ?? jar.get(RECIPIENT_COOKIE)?.value;
  if (!recipient) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: () => void = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: NotificationStreamEvent) => {
        controller.enqueue(encoder.encode(`id: ${event.id}\n`));
        controller.enqueue(encoder.encode(`event: notification\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      unsubscribe = subscribeNotifications(recipient, send);
      controller.enqueue(encoder.encode(`event: ready\ndata: {"ok":true}\n\n`));
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (heartbeat) clearInterval(heartbeat);
        }
      }, 15000);
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

import { publishNotificationEvent } from "@/lib/notifications/server-store";
import type { NotificationType } from "@/types/notification";
import { indexEvent } from "./event-store.service";
import {
  acknowledgeSorobanEvent,
  peekSorobanEvent,
  type QueuedSorobanEvent,
} from "./event-queue.service";

const NOTIFICATION_TYPES: Record<QueuedSorobanEvent["type"], NotificationType | null> = {
  ProjectRegistered: "project_registered",
  ProjectUpdated: "project_update",
  ReviewSubmitted: "review_submitted",
  VerificationApproved: "project_verified",
  VerificationRejected: "project_rejected",
};

function recipientAddresses(payload: Record<string, unknown>): string[] {
  const keys = ["owner", "ownerAddress", "submitter", "submitterAddress", "recipientId", "userAddress"];
  return [...new Set(keys.flatMap((key) => {
    const value = payload[key];
    return typeof value === "string" && value.length > 0 ? [value] : [];
  }))];
}

export async function processQueuedSorobanEvents(
  process: (event: QueuedSorobanEvent) => Promise<void>,
): Promise<number> {
  let processed = 0;
  while (true) {
    const event = await peekSorobanEvent();
    if (!event) return processed;
    await process(event);
    await acknowledgeSorobanEvent(event);
    processed += 1;
  }
}

export async function processSorobanEvent(event: QueuedSorobanEvent): Promise<void> {
  indexEvent(event.type, event.payload, {
    contractId: event.contractId,
    ledger: event.ledger,
    txHash: event.txHash,
  });

  const notificationType = NOTIFICATION_TYPES[event.type];
  if (!notificationType) return;
  const projectId = event.payload.projectId;
  const projectName = event.payload.projectName ?? event.payload.name;
  for (const recipientId of recipientAddresses(event.payload)) {
    const notification = {
      id: `${event.contractId}:${event.txHash}:${event.type}:${recipientId}`,
      type: notificationType,
      recipientId,
      createdAt: new Date().toISOString(),
      ...(typeof projectId === "string" ? { projectId } : {}),
      ...(typeof projectName === "string" ? { projectName } : {}),
      ...(typeof event.payload.reviewId === "string" ? { reviewId: event.payload.reviewId } : {}),
    };
    const ingestUrl = process.env.INDEXER_NOTIFICATION_URL;
    const ingestToken = process.env.INDEXER_NOTIFICATION_TOKEN;
    if (ingestUrl) {
      if (!ingestToken) throw new Error("INDEXER_NOTIFICATION_TOKEN is required with INDEXER_NOTIFICATION_URL");
      const response = await fetch(ingestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ingestToken}`,
        },
        body: JSON.stringify(notification),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Notification ingest failed: ${response.status}`);
    } else {
      publishNotificationEvent(notification);
    }
  }
}
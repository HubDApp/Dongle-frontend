/**
 * Email Queue System
 * 
 * Manages queuing and processing of email messages with retry logic
 */

import { sendEmail, sendBatchEmails, type EmailMessage, type EmailResult } from "./email-service";
import { emailConfig } from "./email-config";

export interface QueuedEmail extends EmailMessage {
  id: string;
  attempts: number;
  createdAt: string;
  lastAttemptAt?: string;
  error?: string;
  status: "pending" | "processing" | "sent" | "failed";
}

/**
 * In-memory email queue (use Redis or a database in production)
 */
class EmailQueue {
  private queue: Map<string, QueuedEmail> = new Map();
  private processing = false;

  /**
   * Add an email to the queue
   */
  add(message: EmailMessage): string {
    const id = `email-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const queuedEmail: QueuedEmail = {
      ...message,
      id,
      attempts: 0,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    this.queue.set(id, queuedEmail);
    console.log(`[email-queue] Added email ${id} to queue`);

    // Trigger processing if not already running
    if (!this.processing) {
      void this.process();
    }

    return id;
  }

  /**
   * Add multiple emails to the queue
   */
  addBatch(messages: EmailMessage[]): string[] {
    const ids: string[] = [];
    
    for (const message of messages) {
      const id = this.add(message);
      ids.push(id);
    }

    return ids;
  }

  /**
   * Get email status
   */
  getStatus(id: string): QueuedEmail | undefined {
    return this.queue.get(id);
  }

  /**
   * Get all emails with a specific status
   */
  getByStatus(status: QueuedEmail["status"]): QueuedEmail[] {
    return Array.from(this.queue.values()).filter((email) => email.status === status);
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const emails = Array.from(this.queue.values());
    return {
      total: emails.length,
      pending: emails.filter((e) => e.status === "pending").length,
      processing: emails.filter((e) => e.status === "processing").length,
      sent: emails.filter((e) => e.status === "sent").length,
      failed: emails.filter((e) => e.status === "failed").length,
    };
  }

  /**
   * Process the email queue
   */
  async process(): Promise<void> {
    if (this.processing) {
      console.log("[email-queue] Already processing");
      return;
    }

    this.processing = true;
    console.log("[email-queue] Starting queue processing");

    try {
      const pendingEmails = this.getByStatus("pending");
      
      if (pendingEmails.length === 0) {
        console.log("[email-queue] No pending emails");
        return;
      }

      console.log(`[email-queue] Processing ${pendingEmails.length} emails`);

      // Process in batches
      const batchSize = emailConfig.queue.batchSize;

      for (let i = 0; i < pendingEmails.length; i += batchSize) {
        const batch = pendingEmails.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (queuedEmail) => {
            await this.processEmail(queuedEmail);
          })
        );

        // Small delay between batches
        if (i + batchSize < pendingEmails.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      console.log("[email-queue] Queue processing complete");
    } catch (error) {
      console.error("[email-queue] Error processing queue:", error);
    } finally {
      this.processing = false;

      // Check if there are still pending emails (failed emails that should be retried)
      const stillPending = this.getByStatus("pending");
      if (stillPending.length > 0) {
        console.log(`[email-queue] ${stillPending.length} emails still pending, will retry later`);
      }
    }
  }

  /**
   * Process a single email
   */
  private async processEmail(queuedEmail: QueuedEmail): Promise<void> {
    const maxAttempts = emailConfig.queue.retryAttempts;

    if (queuedEmail.attempts >= maxAttempts) {
      console.log(`[email-queue] Email ${queuedEmail.id} exceeded max attempts`);
      queuedEmail.status = "failed";
      queuedEmail.error = `Failed after ${maxAttempts} attempts`;
      this.queue.set(queuedEmail.id, queuedEmail);
      return;
    }

    // Mark as processing
    queuedEmail.status = "processing";
    queuedEmail.attempts += 1;
    queuedEmail.lastAttemptAt = new Date().toISOString();
    this.queue.set(queuedEmail.id, queuedEmail);

    console.log(`[email-queue] Processing email ${queuedEmail.id} (attempt ${queuedEmail.attempts}/${maxAttempts})`);

    try {
      const result = await sendEmail({
        to: queuedEmail.to,
        subject: queuedEmail.subject,
        html: queuedEmail.html,
        text: queuedEmail.text,
        replyTo: queuedEmail.replyTo,
      });

      if (result.success) {
        queuedEmail.status = "sent";
        console.log(`[email-queue] Email ${queuedEmail.id} sent successfully`);
      } else {
        queuedEmail.error = result.error;

        if (queuedEmail.attempts < maxAttempts) {
          // Reset to pending for retry
          queuedEmail.status = "pending";
          console.log(`[email-queue] Email ${queuedEmail.id} failed, will retry`);
        } else {
          queuedEmail.status = "failed";
          console.log(`[email-queue] Email ${queuedEmail.id} failed permanently`);
        }
      }

      this.queue.set(queuedEmail.id, queuedEmail);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      queuedEmail.error = errorMessage;

      if (queuedEmail.attempts < maxAttempts) {
        queuedEmail.status = "pending";
      } else {
        queuedEmail.status = "failed";
      }

      this.queue.set(queuedEmail.id, queuedEmail);
      console.error(`[email-queue] Error processing email ${queuedEmail.id}:`, errorMessage);
    }
  }

  /**
   * Clear sent and old failed emails (cleanup)
   */
  cleanup(olderThanHours = 24): number {
    const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
    let removed = 0;

    for (const [id, email] of this.queue.entries()) {
      if (
        (email.status === "sent" || email.status === "failed") &&
        new Date(email.createdAt).getTime() < cutoff
      ) {
        this.queue.delete(id);
        removed++;
      }
    }

    console.log(`[email-queue] Cleaned up ${removed} old emails`);
    return removed;
  }

  /**
   * Clear all emails (for testing)
   */
  clear(): void {
    this.queue.clear();
    console.log("[email-queue] Queue cleared");
  }
}

// Singleton instance
export const emailQueue = new EmailQueue();

// Auto-cleanup every hour
if (typeof window === "undefined") {
  setInterval(
    () => {
      emailQueue.cleanup();
    },
    60 * 60 * 1000
  );
}

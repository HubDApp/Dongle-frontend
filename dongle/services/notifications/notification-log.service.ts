/**
 * Notification Log Service
 * 
 * Tracks all sent notifications for audit and debugging purposes
 */

export interface NotificationLog {
  id: string;
  type: "email" | "in_app" | "push";
  recipient: string;
  subject?: string;
  template: string;
  status: "queued" | "sent" | "failed" | "bounced";
  emailId?: string;
  error?: string;
  createdAt: string;
  sentAt?: string;
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = "dongle_notification_logs";

class NotificationLogService {
  private logs: Map<string, NotificationLog> = new Map();

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
    }
  }

  /**
   * Log a notification
   */
  log(notification: Omit<NotificationLog, "id" | "createdAt">): string {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const log: NotificationLog = {
      ...notification,
      id,
      createdAt: new Date().toISOString(),
    };

    this.logs.set(id, log);
    this.saveToStorage();

    console.log(`[notification-log] Logged ${notification.type} notification ${id}`);
    
    return id;
  }

  /**
   * Update notification status
   */
  updateStatus(
    id: string,
    status: NotificationLog["status"],
    options?: { sentAt?: string; error?: string }
  ): boolean {
    const log = this.logs.get(id);
    
    if (!log) {
      console.warn(`[notification-log] Notification ${id} not found`);
      return false;
    }

    log.status = status;
    
    if (options?.sentAt) {
      log.sentAt = options.sentAt;
    }
    
    if (options?.error) {
      log.error = options.error;
    }

    this.logs.set(id, log);
    this.saveToStorage();

    console.log(`[notification-log] Updated ${id} status to ${status}`);
    
    return true;
  }

  /**
   * Get notification log by ID
   */
  getLog(id: string): NotificationLog | undefined {
    return this.logs.get(id);
  }

  /**
   * Get all logs
   */
  getAllLogs(): NotificationLog[] {
    return Array.from(this.logs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get logs by recipient
   */
  getLogsByRecipient(recipient: string): NotificationLog[] {
    return this.getAllLogs().filter((log) => log.recipient === recipient);
  }

  /**
   * Get logs by type
   */
  getLogsByType(type: NotificationLog["type"]): NotificationLog[] {
    return this.getAllLogs().filter((log) => log.type === type);
  }

  /**
   * Get logs by status
   */
  getLogsByStatus(status: NotificationLog["status"]): NotificationLog[] {
    return this.getAllLogs().filter((log) => log.status === status);
  }

  /**
   * Get logs within a date range
   */
  getLogsByDateRange(startDate: Date, endDate: Date): NotificationLog[] {
    return this.getAllLogs().filter((log) => {
      const logDate = new Date(log.createdAt);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  /**
   * Get notification statistics
   */
  getStats() {
    const logs = this.getAllLogs();
    
    return {
      total: logs.length,
      byType: {
        email: logs.filter((l) => l.type === "email").length,
        in_app: logs.filter((l) => l.type === "in_app").length,
        push: logs.filter((l) => l.type === "push").length,
      },
      byStatus: {
        queued: logs.filter((l) => l.status === "queued").length,
        sent: logs.filter((l) => l.status === "sent").length,
        failed: logs.filter((l) => l.status === "failed").length,
        bounced: logs.filter((l) => l.status === "bounced").length,
      },
      last24Hours: logs.filter((l) => {
        const logDate = new Date(l.createdAt);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return logDate >= oneDayAgo;
      }).length,
    };
  }

  /**
   * Clean up old logs (older than specified days)
   */
  cleanup(olderThanDays = 30): number {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    let removed = 0;

    for (const [id, log] of this.logs.entries()) {
      if (new Date(log.createdAt).getTime() < cutoff) {
        this.logs.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      this.saveToStorage();
      console.log(`[notification-log] Cleaned up ${removed} old logs`);
    }

    return removed;
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs.clear();
    this.saveToStorage();
    console.log("[notification-log] All logs cleared");
  }

  /**
   * Load logs from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const logsArray: NotificationLog[] = JSON.parse(stored);
        this.logs = new Map(logsArray.map((log) => [log.id, log]));
        console.log(`[notification-log] Loaded ${this.logs.size} logs from storage`);
      }
    } catch (error) {
      console.error("[notification-log] Failed to load from storage:", error);
    }
  }

  /**
   * Save logs to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const logsArray = Array.from(this.logs.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logsArray));
    } catch (error) {
      console.error("[notification-log] Failed to save to storage:", error);
    }
  }
}

// Singleton instance
export const notificationLogService = new NotificationLogService();

// Auto-cleanup every day
if (typeof window !== "undefined") {
  setInterval(
    () => {
      notificationLogService.cleanup();
    },
    24 * 60 * 60 * 1000
  );
}

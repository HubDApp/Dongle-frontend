/**
 * Notification Preferences Service
 * 
 * Manages user notification preferences
 */

export interface NotificationPreferences {
  userId: string; // Wallet address
  email?: string;
  enabled: boolean;
  channels: {
    email: boolean;
    inApp: boolean;
    push: boolean;
  };
  events: {
    projectUpdates: boolean;
    reviewComments: boolean;
    reviewMentions: boolean;
    verificationStatus: boolean;
    newFollowers: boolean;
    weeklyDigest: boolean;
  };
  updatedAt: string;
}

const STORAGE_KEY = "dongle_notification_preferences";

const DEFAULT_PREFERENCES: Omit<NotificationPreferences, "userId" | "updatedAt"> = {
  enabled: true,
  channels: {
    email: true,
    inApp: true,
    push: false,
  },
  events: {
    projectUpdates: true,
    reviewComments: true,
    reviewMentions: true,
    verificationStatus: true,
    newFollowers: false,
    weeklyDigest: true,
  },
};

class NotificationPreferencesService {
  private preferences: Map<string, NotificationPreferences> = new Map();

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
    }
  }

  /**
   * Get user preferences (creates default if not exists)
   */
  getPreferences(userId: string): NotificationPreferences {
    let prefs = this.preferences.get(userId);

    if (!prefs) {
      prefs = {
        ...DEFAULT_PREFERENCES,
        userId,
        updatedAt: new Date().toISOString(),
      };
      this.preferences.set(userId, prefs);
      this.saveToStorage();
    }

    return prefs;
  }

  /**
   * Update user preferences
   */
  updatePreferences(
    userId: string,
    updates: Partial<Omit<NotificationPreferences, "userId" | "updatedAt">>
  ): NotificationPreferences {
    const current = this.getPreferences(userId);

    const updated: NotificationPreferences = {
      ...current,
      ...updates,
      channels: updates.channels
        ? { ...current.channels, ...updates.channels }
        : current.channels,
      events: updates.events
        ? { ...current.events, ...updates.events }
        : current.events,
      updatedAt: new Date().toISOString(),
    };

    this.preferences.set(userId, updated);
    this.saveToStorage();

    console.log(`[notification-prefs] Updated preferences for ${userId}`);

    return updated;
  }

  /**
   * Update user email
   */
  setEmail(userId: string, email: string): NotificationPreferences {
    return this.updatePreferences(userId, { email });
  }

  /**
   * Check if user should receive a notification
   */
  shouldNotify(
    userId: string,
    event: keyof NotificationPreferences["events"],
    channel: keyof NotificationPreferences["channels"]
  ): boolean {
    const prefs = this.getPreferences(userId);

    if (!prefs.enabled) {
      return false;
    }

    if (!prefs.channels[channel]) {
      return false;
    }

    if (!prefs.events[event]) {
      return false;
    }

    // For email notifications, require email address
    if (channel === "email" && !prefs.email) {
      return false;
    }

    return true;
  }

  /**
   * Enable all notifications for a user
   */
  enableAll(userId: string): NotificationPreferences {
    return this.updatePreferences(userId, {
      enabled: true,
      channels: {
        email: true,
        inApp: true,
        push: true,
      },
      events: {
        projectUpdates: true,
        reviewComments: true,
        reviewMentions: true,
        verificationStatus: true,
        newFollowers: true,
        weeklyDigest: true,
      },
    });
  }

  /**
   * Disable all notifications for a user
   */
  disableAll(userId: string): NotificationPreferences {
    return this.updatePreferences(userId, { enabled: false });
  }

  /**
   * Get all users with email notifications enabled for a specific event
   */
  getUsersForEmailNotification(
    event: keyof NotificationPreferences["events"]
  ): NotificationPreferences[] {
    return Array.from(this.preferences.values()).filter(
      (prefs) =>
        prefs.enabled &&
        prefs.channels.email &&
        prefs.events[event] &&
        prefs.email
    );
  }

  /**
   * Export preferences for backup
   */
  exportPreferences(): NotificationPreferences[] {
    return Array.from(this.preferences.values());
  }

  /**
   * Import preferences from backup
   */
  importPreferences(prefs: NotificationPreferences[]): void {
    for (const pref of prefs) {
      this.preferences.set(pref.userId, pref);
    }
    this.saveToStorage();
    console.log(`[notification-prefs] Imported ${prefs.length} preferences`);
  }

  /**
   * Load preferences from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const prefsArray: NotificationPreferences[] = JSON.parse(stored);
        this.preferences = new Map(
          prefsArray.map((pref) => [pref.userId, pref])
        );
        console.log(
          `[notification-prefs] Loaded ${this.preferences.size} preferences from storage`
        );
      }
    } catch (error) {
      console.error("[notification-prefs] Failed to load from storage:", error);
    }
  }

  /**
   * Save preferences to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const prefsArray = Array.from(this.preferences.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefsArray));
    } catch (error) {
      console.error("[notification-prefs] Failed to save to storage:", error);
    }
  }
}

// Singleton instance
export const notificationPreferencesService = new NotificationPreferencesService();

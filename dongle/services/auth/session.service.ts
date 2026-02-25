const SESSION_KEY = "dongle_session";

export interface Session {
  publicKey: string;
  connectedAt: string;
}

export const sessionService = {
  /**
   * Persist a new session for the given wallet public key.
   */
  createSession(publicKey: string): Session {
    const session: Session = {
      publicKey,
      connectedAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  /**
   * Retrieve the current session, or null if none exists / is corrupt.
   */
  getSession(): Session | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed?.publicKey) return null;

      return parsed as Session;
    } catch {
      return null;
    }
  },

  /**
   * Remove the persisted session.
   */
  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  /**
   * Quick check — true when a valid session record is present.
   */
  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },
};

"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { sessionService } from "@/services/auth/session.service";
import { walletService } from "@/services/wallet/wallet.service";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AuthState {
    publicKey: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

interface AuthContextValue extends AuthState {
    login: (publicKey: string) => void;
    logout: () => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        publicKey: null,
        isAuthenticated: false,
        isLoading: true,
    });

    /* ---- restore session on mount ---- */
    useEffect(() => {
        async function restore() {
            const session = sessionService.getSession();

            if (session) {
                // Verify the wallet is still connected
                const connected = await walletService.isConnected();

                if (connected) {
                    setState({
                        publicKey: session.publicKey,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                    return;
                }

                // Wallet disconnected externally — clear stale session
                sessionService.clearSession();
            }

            setState({
                publicKey: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }

        restore();
    }, []);

    /* ---- actions ---- */
    const login = useCallback((publicKey: string) => {
        sessionService.createSession(publicKey);
        setState({
            publicKey,
            isAuthenticated: true,
            isLoading: false,
        });
    }, []);

    const logout = useCallback(() => {
        walletService.disconnectWallet();
        sessionService.clearSession();
        setState({
            publicKey: null,
            isAuthenticated: false,
            isLoading: false,
        });
    }, []);

    /* ---- memoised value ---- */
    const value = useMemo<AuthContextValue>(
        () => ({ ...state, login, logout }),
        [state, login, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within an <AuthProvider>");
    }
    return ctx;
}

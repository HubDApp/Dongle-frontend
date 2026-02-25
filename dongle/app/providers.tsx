"use client";

import { AuthProvider } from "@/context/auth.context";
import { WalletProvider } from "@/context/wallet.context";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WalletProvider>
            <AuthProvider>{children}</AuthProvider>
        </WalletProvider>
    );
}

import { NextResponse } from "next/server";
import { createSessionToken, getSession, setSessionCookie } from "@/lib/auth/session";
import { recordAuthAudit, unlinkWallet } from "@/lib/auth/users";

export const dynamic = "force-dynamic";

/** DELETE /api/auth/unlink-wallet — removes the linked wallet from the OAuth user. */
export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const previous = session.walletAddress;
  const user = unlinkWallet(session.sub);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  recordAuthAudit({ userId: user.id, action: "wallet_unlink", detail: previous });
  await setSessionCookie(await createSessionToken(user, session.sessionId));
  return NextResponse.json({ user });
}

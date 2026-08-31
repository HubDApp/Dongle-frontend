import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUser } from "@/lib/auth/users";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  const stored = getUser(session.sub);
  return NextResponse.json({
    user: {
      id: session.sub,
      provider: session.provider,
      email: session.email ?? stored?.email,
      name: session.name ?? stored?.name,
      avatarUrl: session.avatarUrl ?? stored?.avatarUrl,
      walletAddress: session.walletAddress ?? stored?.walletAddress,
    },
  });
}

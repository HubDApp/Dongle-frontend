import { NextResponse } from "next/server";
import {
  createSessionToken,
  getSession,
  setSessionCookie,
} from "@/lib/auth/session";
import { getUser, linkWallet } from "@/lib/auth/users";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { walletAddress?: string };
  if (!body.walletAddress || !/^G[A-Z2-7]{55}$/.test(body.walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const updated = linkWallet(session.sub, body.walletAddress);
  const user = updated ?? getUser(session.sub);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const token = await createSessionToken(user);
  await setSessionCookie(token);
  return NextResponse.json({ user });
}

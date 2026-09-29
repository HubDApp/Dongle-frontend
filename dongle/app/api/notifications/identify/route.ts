import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { RECIPIENT_COOKIE } from "@/lib/notifications/constants";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  const body = (await request.json()) as { recipientId?: string };
  const recipientId = session?.sub ?? body.recipientId;
  if (!recipientId || typeof recipientId !== "string") {
    return NextResponse.json({ error: "Missing recipient" }, { status: 400 });
  }

  const jar = await cookies();
  jar.set(RECIPIENT_COOKIE, recipientId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true, recipientId });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(RECIPIENT_COOKIE);
  return NextResponse.json({ ok: true });
}

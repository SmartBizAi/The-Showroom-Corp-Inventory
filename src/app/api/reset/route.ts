import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { resetDb } from '@/lib/store';
import { DEALER_COOKIE } from '@/lib/session';

/** Puts the demo back to its opening state — useful between client meetings. */
export async function POST() {
  const db = resetDb();
  const jar = await cookies();
  jar.set(DEALER_COOKIE, db.dealers[0].id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb } from '@/lib/store';
import { DEALER_COOKIE } from '@/lib/session';

export async function POST(request: Request) {
  const { dealerId } = (await request.json()) as { dealerId?: string };
  const db = readDb();
  if (!dealerId || !db.dealers.some((d) => d.id === dealerId)) {
    return NextResponse.json({ error: 'Dealer no encontrado' }, { status: 404 });
  }

  const jar = await cookies();
  jar.set(DEALER_COOKIE, dealerId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return NextResponse.json({ ok: true, dealerId });
}

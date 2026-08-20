import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { mutate, newId } from '@/lib/store';
import { DEALER_COOKIE } from '@/lib/session';
import { PLATFORMS, type Dealer } from '@/lib/types';

interface Body {
  name?: string;
  city?: string;
  phone?: string;
  tone?: string;
  financing?: boolean;
  copySellersFrom?: string | null;
}

/** Creates an empty workspace — this is how a prospect gets their own demo. */
export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const name = (body.name ?? '').trim();
  if (name === '') {
    return NextResponse.json({ error: 'El nombre del dealer es obligatorio' }, { status: 400 });
  }

  const dealer = mutate((db) => {
    const created: Dealer = {
      id: newId('dlr'),
      name,
      city: (body.city ?? 'Miami, FL').trim() || 'Miami, FL',
      phone: (body.phone ?? '').trim(),
      accent: '#0E7A74',
      tone: (body.tone ?? 'Cercano y directo, con emojis. Siempre menciona que hablamos español.').trim(),
      financing: body.financing ?? true,
      // A brand-new workspace starts fully disconnected: the client plugs in
      // their own accounts from /conexiones.
      connections: PLATFORMS.map((p) => ({
        platform: p.id,
        connected: false,
        accountName: null,
        live: false,
        connectedAt: null,
      })),
      createdAt: new Date().toISOString(),
    };
    db.dealers.push(created);

    if (body.copySellersFrom) {
      for (const s of db.sellerAccounts.filter((x) => x.dealerId === body.copySellersFrom)) {
        db.sellerAccounts.push({ ...s, id: newId('sel'), dealerId: created.id });
      }
    }
    return created;
  });

  const jar = await cookies();
  jar.set(DEALER_COOKIE, dealer.id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true, dealer });
}

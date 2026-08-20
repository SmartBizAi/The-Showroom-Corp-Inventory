import { NextResponse } from 'next/server';
import { mutate, newId, readDb } from '@/lib/store';
import { currentDealerId } from '@/lib/session';
import { generatePairSafe } from '@/lib/captions';
import type { Caption, Platform } from '@/lib/types';

interface Body {
  vehicleId?: string;
  platform?: Platform;
  /** Manual edit path: save exactly this text instead of generating. */
  text?: string;
  lang?: 'es' | 'en';
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const dealerId = await currentDealerId();
  const db = readDb();

  const vehicle = db.vehicles.find((v) => v.id === body.vehicleId && v.dealerId === dealerId);
  const dealer = db.dealers.find((d) => d.id === dealerId);
  const platform = body.platform;

  if (!vehicle || !dealer || !platform) {
    return NextResponse.json({ error: 'Vehículo o plataforma no válidos' }, { status: 400 });
  }

  // --- Manual edit
  if (typeof body.text === 'string' && body.lang) {
    const saved = mutate((db2) => upsert(db2, vehicle.id, platform, body.lang!, body.text!, 'manual'));
    return NextResponse.json({ ok: true, captions: [saved] });
  }

  // --- Generate both languages
  const pair = await generatePairSafe(vehicle, dealer, platform);
  const saved = mutate((db2) => [
    upsert(db2, vehicle.id, platform, 'es', pair.es, pair.source),
    upsert(db2, vehicle.id, platform, 'en', pair.en, pair.source),
  ]);

  return NextResponse.json({
    ok: true,
    captions: saved,
    source: pair.source,
    warning: 'warning' in pair ? pair.warning : undefined,
  });
}

function upsert(
  db: ReturnType<typeof readDb>,
  vehicleId: string,
  platform: Platform,
  lang: 'es' | 'en',
  text: string,
  source: Caption['source'],
): Caption {
  const existing = db.captions.find(
    (c) => c.vehicleId === vehicleId && c.platform === platform && c.lang === lang,
  );
  if (existing) {
    existing.text = text;
    existing.source = source;
    existing.createdAt = new Date().toISOString();
    return existing;
  }
  const created: Caption = {
    id: newId('cap'),
    vehicleId,
    platform,
    lang,
    text,
    source,
    createdAt: new Date().toISOString(),
  };
  db.captions.push(created);
  return created;
}

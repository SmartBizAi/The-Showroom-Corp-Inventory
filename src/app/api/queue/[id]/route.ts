import { NextResponse } from 'next/server';
import { mutate } from '@/lib/store';
import { currentDealerId } from '@/lib/session';
import { platformMeta } from '@/lib/types';

interface Body {
  action?: 'publish' | 'skip' | 'reset';
  /** Real listing URL, when the seller pastes it back after posting. */
  listingUrl?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { action = 'publish', listingUrl } = (await request.json()) as Body;
  const dealerId = await currentDealerId();

  const outcome = mutate((db) => {
    const item = db.queue.find((q) => q.id === id && q.dealerId === dealerId);
    if (!item) return null;

    const dealer = db.dealers.find((d) => d.id === dealerId);
    const conn = dealer?.connections.find((c) => c.platform === item.platform);

    if (action === 'skip') {
      item.status = 'skipped';
      item.publishedAt = null;
      return { item, live: false };
    }

    if (action === 'reset') {
      item.status = 'pending';
      item.publishedAt = null;
      item.listingUrl = null;
      return { item, live: false };
    }

    item.status = 'published';
    item.publishedAt = new Date().toISOString();
    item.listingUrl = listingUrl?.trim() || null;
    // `live` records whether this went out through a real API or was logged in
    // demo mode — the UI is explicit about the difference.
    return { item, live: Boolean(conn?.live) };
  });

  if (!outcome) return NextResponse.json({ error: 'Elemento no encontrado' }, { status: 404 });

  return NextResponse.json({
    ok: true,
    item: outcome.item,
    live: outcome.live,
    platform: platformMeta(outcome.item.platform).label,
  });
}

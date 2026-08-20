import { NextResponse } from 'next/server';
import { mutate } from '@/lib/store';
import { currentDealerId } from '@/lib/session';
import type { Platform } from '@/lib/types';

interface Body {
  platform?: Platform;
  connected?: boolean;
  accountName?: string | null;
}

/**
 * Connect / disconnect a channel for the active dealer. `live` stays false
 * until real API credentials exist in the environment — see .env.example.
 */
export async function PATCH(request: Request) {
  const body = (await request.json()) as Body;
  const dealerId = await currentDealerId();

  if (!body.platform) {
    return NextResponse.json({ error: 'Falta la plataforma' }, { status: 400 });
  }

  const hasCredentials = credentialsFor(body.platform);

  const connection = mutate((db) => {
    const dealer = db.dealers.find((d) => d.id === dealerId);
    const conn = dealer?.connections.find((c) => c.platform === body.platform);
    if (!conn) return null;

    if (body.connected !== undefined) {
      conn.connected = body.connected;
      conn.connectedAt = body.connected ? new Date().toISOString() : null;
      if (!body.connected) conn.accountName = null;
    }
    if (body.accountName !== undefined) {
      conn.accountName = body.accountName?.trim() || null;
    }
    conn.live = conn.connected && hasCredentials;
    return conn;
  });

  if (!connection) return NextResponse.json({ error: 'Conexión no encontrada' }, { status: 404 });
  return NextResponse.json({ ok: true, connection, hasCredentials });
}

/** Which env vars would make each channel actually publish for real. */
function credentialsFor(platform: Platform): boolean {
  switch (platform) {
    case 'facebook_page':
      return Boolean(process.env.META_PAGE_ID && process.env.META_ACCESS_TOKEN);
    case 'instagram':
      return Boolean(process.env.META_IG_USER_ID && process.env.META_ACCESS_TOKEN);
    case 'whatsapp':
      return Boolean(process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_TOKEN);
    case 'cargurus':
      return Boolean(process.env.CARGURUS_FEED_ID);
    case 'offerup':
      return Boolean(process.env.OFFERUP_DEALER_ID);
    case 'marketplace':
      // Assisted lane: there is no credential to hold. The seller's own browser
      // session does the publishing, which is exactly the point.
      return false;
  }
}

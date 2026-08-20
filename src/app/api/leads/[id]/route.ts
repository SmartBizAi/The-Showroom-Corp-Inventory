import { NextResponse } from 'next/server';
import { mutate } from '@/lib/store';
import { currentDealerId } from '@/lib/session';
import type { LeadStage } from '@/lib/types';

interface Body {
  stage?: LeadStage;
  reply?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as Body;
  const dealerId = await currentDealerId();

  const lead = mutate((db) => {
    const found = db.leads.find((l) => l.id === id && l.dealerId === dealerId);
    if (!found) return null;

    if (body.stage) found.stage = body.stage;

    if (body.reply?.trim()) {
      found.messages.push({
        from: 'dealer',
        text: body.reply.trim(),
        at: new Date().toISOString(),
      });
      // Replying to an untouched lead advances it — no extra click needed.
      if (found.stage === 'new') found.stage = 'contacted';
    }
    return found;
  });

  if (!lead) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true, lead });
}

import { NextResponse } from 'next/server';
import { mutate, newId } from '@/lib/store';
import { currentDealerId } from '@/lib/session';
import type { Dealer, SellerAccount } from '@/lib/types';

interface Body {
  dealer?: Partial<Pick<Dealer, 'name' | 'city' | 'phone' | 'tone' | 'financing'>>;
  addSeller?: { name: string; dailyLimit?: number; seasoned?: boolean };
  updateSeller?: { id: string; name?: string; dailyLimit?: number; seasoned?: boolean };
  removeSellerId?: string;
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Body;
  const dealerId = await currentDealerId();

  const result = mutate((db) => {
    const dealer = db.dealers.find((d) => d.id === dealerId);
    if (!dealer) return null;

    if (body.dealer) {
      const { name, city, phone, tone, financing } = body.dealer;
      if (name !== undefined && name.trim() !== '') dealer.name = name.trim();
      if (city !== undefined) dealer.city = city.trim();
      if (phone !== undefined) dealer.phone = phone.trim();
      if (tone !== undefined) dealer.tone = tone.trim();
      if (financing !== undefined) dealer.financing = financing;
    }

    if (body.addSeller?.name.trim()) {
      const seller: SellerAccount = {
        id: newId('sel'),
        dealerId,
        name: body.addSeller.name.trim(),
        dailyLimit: body.addSeller.dailyLimit ?? 5,
        seasoned: body.addSeller.seasoned ?? false,
      };
      db.sellerAccounts.push(seller);
    }

    if (body.updateSeller) {
      const s = db.sellerAccounts.find(
        (x) => x.id === body.updateSeller!.id && x.dealerId === dealerId,
      );
      if (s) {
        if (body.updateSeller.name !== undefined && body.updateSeller.name.trim() !== '') {
          s.name = body.updateSeller.name.trim();
        }
        if (body.updateSeller.dailyLimit !== undefined) s.dailyLimit = body.updateSeller.dailyLimit;
        if (body.updateSeller.seasoned !== undefined) s.seasoned = body.updateSeller.seasoned;
      }
    }

    if (body.removeSellerId) {
      db.sellerAccounts = db.sellerAccounts.filter(
        (s) => !(s.id === body.removeSellerId && s.dealerId === dealerId),
      );
      db.queue = db.queue.filter(
        (q) => !(q.sellerAccountId === body.removeSellerId && q.status === 'pending'),
      );
    }

    return dealer;
  });

  if (!result) return NextResponse.json({ error: 'Dealer no encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true, dealer: result });
}

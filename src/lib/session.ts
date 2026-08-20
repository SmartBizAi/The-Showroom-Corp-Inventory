// Which dealer workspace the browser is looking at. Swapping the demo over to a
// prospect is switching this cookie — every query below is dealer-scoped.

import { cookies } from 'next/headers';
import { readDb } from './store';
import type { Dealer } from './types';

export const DEALER_COOKIE = 'sh_dealer';

export async function currentDealer(): Promise<Dealer> {
  const db = readDb();
  if (db.dealers.length === 0) throw new Error('No hay dealers en la base de datos');

  const jar = await cookies();
  const wanted = jar.get(DEALER_COOKIE)?.value;
  return db.dealers.find((d) => d.id === wanted) ?? db.dealers[0];
}

export async function currentDealerId(): Promise<string> {
  return (await currentDealer()).id;
}

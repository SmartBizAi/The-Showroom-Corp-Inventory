import { NextResponse } from 'next/server';
import { mutate } from '@/lib/store';
import { currentDealerId } from '@/lib/session';
import { pruneQueue } from '@/lib/queue';
import type { Vehicle } from '@/lib/types';

type Patch = Partial<Omit<Vehicle, 'id' | 'dealerId' | 'createdAt'>>;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const patch = (await request.json()) as Patch;
  const dealerId = await currentDealerId();

  const result = mutate((db) => {
    const vehicle = db.vehicles.find((v) => v.id === id && v.dealerId === dealerId);
    if (!vehicle) return null;

    Object.assign(vehicle, patch);

    // A sold car must stop being advertised — drop its pending posts and warn
    // about the Marketplace listings a human still has to take down.
    if (patch.status === 'sold') {
      pruneQueue(db, dealerId);
    }
    return vehicle;
  });

  if (!result) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true, vehicle: result });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const dealerId = await currentDealerId();

  const removed = mutate((db) => {
    const idx = db.vehicles.findIndex((v) => v.id === id && v.dealerId === dealerId);
    if (idx === -1) return false;
    db.vehicles.splice(idx, 1);
    db.captions = db.captions.filter((c) => c.vehicleId !== id);
    db.queue = db.queue.filter((q) => q.vehicleId !== id);
    return true;
  });

  if (!removed) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

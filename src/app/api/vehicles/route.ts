import { NextResponse } from 'next/server';
import { mutate, newId } from '@/lib/store';
import { currentDealerId } from '@/lib/session';
import { placeholderPhoto } from '@/lib/seed';
import type { TitleType, Vehicle, VehicleStatus } from '@/lib/types';

interface Body {
  vin?: string | null;
  stockNumber?: string | null;
  year?: number;
  make?: string;
  model?: string;
  trim?: string | null;
  mileage?: number;
  price?: number;
  cost?: number | null;
  titleType?: TitleType;
  transmission?: string | null;
  fuel?: string | null;
  exteriorColor?: string | null;
  interiorColor?: string | null;
  features?: string[];
  status?: VehicleStatus;
  photos?: string[];
  notes?: string | null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const dealerId = await currentDealerId();

  const missing = (['year', 'make', 'model'] as const).filter((k) => !body[k]);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Faltan datos obligatorios: ${missing.join(', ')}.` },
      { status: 400 },
    );
  }

  const make = String(body.make);
  const model = String(body.model);
  const year = Number(body.year);
  const hue = Math.abs([...`${make}${model}`].reduce((a, c) => a + c.charCodeAt(0), 0)) % 360;

  const vehicle = mutate((db) => {
    const created: Vehicle = {
      id: newId('veh'),
      dealerId,
      vin: body.vin?.trim() || null,
      stockNumber: body.stockNumber?.trim() || null,
      year,
      make,
      model,
      trim: body.trim?.trim() || null,
      mileage: Number(body.mileage) || 0,
      price: Number(body.price) || 0,
      cost: body.cost === null || body.cost === undefined ? null : Number(body.cost),
      titleType: body.titleType ?? 'clean',
      transmission: body.transmission?.trim() || null,
      fuel: body.fuel?.trim() || null,
      exteriorColor: body.exteriorColor?.trim() || null,
      interiorColor: body.interiorColor?.trim() || null,
      features: (body.features ?? []).filter((f) => f.trim() !== ''),
      status: body.status ?? 'available',
      photos:
        body.photos && body.photos.length > 0
          ? body.photos
          : [placeholderPhoto(`${year} ${make} ${model}`, hue)],
      notes: body.notes?.trim() || null,
      createdAt: new Date().toISOString(),
    };
    db.vehicles.push(created);
    return created;
  });

  return NextResponse.json({ ok: true, vehicle });
}

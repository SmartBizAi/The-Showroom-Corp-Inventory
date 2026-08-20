import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readDb } from '@/lib/store';
import { currentDealer } from '@/lib/session';
import { money, miles, vehicleName, daysOnLot, STATUS_LABEL, TITLE_LABEL } from '@/lib/format';
import { PLATFORMS } from '@/lib/types';
import { VehicleDetail } from '@/components/VehicleDetail';

export const dynamic = 'force-dynamic';

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dealer = await currentDealer();
  const db = readDb();

  const vehicle = db.vehicles.find((v) => v.id === id && v.dealerId === dealer.id);
  if (!vehicle) notFound();

  const captions = db.captions.filter((c) => c.vehicleId === vehicle.id);
  const posts = db.queue.filter((q) => q.vehicleId === vehicle.id && q.status === 'published');

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/inventario" className="small" style={{ textDecoration: 'none' }}>← Inventario</Link>
          <h1 style={{ marginTop: 6 }}>{vehicleName(vehicle)}</h1>
          <p>
            {money(vehicle.price)} · {miles(vehicle.mileage)} · {TITLE_LABEL[vehicle.titleType]} ·{' '}
            {daysOnLot(vehicle)} días en el lote · {STATUS_LABEL[vehicle.status]}
          </p>
        </div>
      </div>

      <VehicleDetail
        vehicle={{
          id: vehicle.id,
          name: vehicleName(vehicle),
          price: vehicle.price,
          status: vehicle.status,
          photos: vehicle.photos,
          vin: vehicle.vin,
          stockNumber: vehicle.stockNumber,
          transmission: vehicle.transmission,
          fuel: vehicle.fuel,
          exteriorColor: vehicle.exteriorColor,
          features: vehicle.features,
        }}
        platforms={PLATFORMS.map((p) => ({ id: p.id, label: p.label, lane: p.lane }))}
        captions={captions.map((c) => ({ platform: c.platform, lang: c.lang, text: c.text, source: c.source }))}
        publishedCount={posts.length}
      />
    </>
  );
}

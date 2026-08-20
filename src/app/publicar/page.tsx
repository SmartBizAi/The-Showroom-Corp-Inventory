import { readDb, today } from '@/lib/store';
import { currentDealer } from '@/lib/session';
import { PublishBoard, type QueueCardData } from '@/components/PublishBoard';
import { platformMeta } from '@/lib/types';
import { vehicleName, money, miles } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PublishPage() {
  const dealer = await currentDealer();
  const db = readDb();
  const day = today();

  const sellers = db.sellerAccounts.filter((s) => s.dealerId === dealer.id);
  const sellerName = new Map(sellers.map((s) => [s.id, s.name]));
  const vehicles = new Map(db.vehicles.map((v) => [v.id, v]));

  const items: QueueCardData[] = db.queue
    .filter((q) => q.dealerId === dealer.id && q.scheduledFor === day)
    .map((q) => {
      const v = vehicles.get(q.vehicleId);
      const meta = platformMeta(q.platform);
      const caps = db.captions.filter((c) => c.vehicleId === q.vehicleId && c.platform === q.platform);
      return {
        id: q.id,
        status: q.status,
        platform: q.platform,
        platformLabel: meta.label,
        lane: meta.lane,
        listingUrl: q.listingUrl,
        sellerName: q.sellerAccountId ? (sellerName.get(q.sellerAccountId) ?? 'Vendedor') : null,
        vehicleId: q.vehicleId,
        vehicleName: v ? vehicleName(v) : 'Vehículo eliminado',
        vehiclePrice: v ? money(v.price) : '',
        vehicleMiles: v ? miles(v.mileage) : '',
        photo: v?.photos[0] ?? '',
        photoCount: v?.photos.length ?? 0,
        captionEs: caps.find((c) => c.lang === 'es')?.text ?? null,
        captionEn: caps.find((c) => c.lang === 'en')?.text ?? null,
      };
    });

  const connectedCount = dealer.connections.filter((c) => c.connected).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Publicar hoy</h1>
          <p>
            Los canales oficiales salen solos. Marketplace lo confirma el vendedor: un click por
            auto, con el anuncio ya armado.
          </p>
        </div>
      </div>

      <PublishBoard
        items={items}
        sellers={sellers.map((s) => ({ id: s.id, name: s.name }))}
        connectedCount={connectedCount}
        dealerName={dealer.name}
      />
    </>
  );
}

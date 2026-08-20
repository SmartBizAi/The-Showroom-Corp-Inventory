import { readDb } from '@/lib/store';
import { currentDealer } from '@/lib/session';
import { vehicleName } from '@/lib/format';
import { LeadsInbox, type LeadCard } from '@/components/LeadsInbox';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const dealer = await currentDealer();
  const db = readDb();
  const vehicles = new Map(db.vehicles.map((v) => [v.id, v]));

  const leads: LeadCard[] = db.leads
    .filter((l) => l.dealerId === dealer.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((l) => {
      const v = l.vehicleId ? vehicles.get(l.vehicleId) : undefined;
      return {
        id: l.id,
        name: l.name,
        channel: l.channel,
        handle: l.handle,
        stage: l.stage,
        lang: l.lang,
        vehicleName: v ? vehicleName(v) : null,
        vehiclePhoto: v?.photos[0] ?? null,
        messages: l.messages,
      };
    });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Clientes</h1>
          <p>
            Messenger, Instagram y WhatsApp en una sola bandeja, con el auto que le interesa a cada
            uno. Respuestas rápidas en español e inglés.
          </p>
        </div>
      </div>

      <LeadsInbox leads={leads} dealerName={dealer.name} />
    </>
  );
}

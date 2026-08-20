import { readDb } from '@/lib/store';
import { currentDealer } from '@/lib/session';
import { SettingsPanel } from '@/components/SettingsPanel';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const dealer = await currentDealer();
  const db = readDb();
  const sellers = db.sellerAccounts.filter((s) => s.dealerId === dealer.id);
  const vehicleCount = db.vehicles.filter((v) => v.dealerId === dealer.id).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ajustes</h1>
          <p>Datos del dealer, voz de los anuncios y vendedores que publican en Marketplace.</p>
        </div>
      </div>

      <SettingsPanel
        dealer={{
          id: dealer.id,
          name: dealer.name,
          city: dealer.city,
          phone: dealer.phone,
          tone: dealer.tone,
          financing: dealer.financing,
        }}
        sellers={sellers.map((s) => ({
          id: s.id,
          name: s.name,
          dailyLimit: s.dailyLimit,
          seasoned: s.seasoned,
        }))}
        dealerCount={db.dealers.length}
        vehicleCount={vehicleCount}
      />
    </>
  );
}

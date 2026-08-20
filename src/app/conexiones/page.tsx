import { currentDealer } from '@/lib/session';
import { PLATFORMS } from '@/lib/types';
import { ConnectionsBoard } from '@/components/ConnectionsBoard';

export const dynamic = 'force-dynamic';

export default async function ConnectionsPage() {
  const dealer = await currentDealer();

  const rows = PLATFORMS.map((p) => {
    const conn = dealer.connections.find((c) => c.platform === p.id);
    return {
      platform: p.id,
      label: p.label,
      lane: p.lane,
      note: p.note,
      accountHint: p.accountHint,
      connected: conn?.connected ?? false,
      accountName: conn?.accountName ?? null,
      live: conn?.live ?? false,
    };
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Conexiones</h1>
          <p>
            Las cuentas de <strong>{dealer.name}</strong>. Para pasar la demo a un cliente, crea su
            workspace en Ajustes y conecta aquí sus cuentas — no hay que tocar nada más.
          </p>
        </div>
      </div>

      <ConnectionsBoard rows={rows} dealerName={dealer.name} />
    </>
  );
}

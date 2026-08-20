import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { currentDealer } from '@/lib/session';
import { readDb, storageMode, today } from '@/lib/store';

export const metadata: Metadata = {
  title: 'Showroom Hub',
  description: 'Marketing y atención al cliente para dealers de autos usados en Miami',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const dealer = await currentDealer();
  const db = readDb();

  const pendingToday = db.queue.filter(
    (q) => q.dealerId === dealer.id && q.scheduledFor === today() && q.status === 'pending',
  ).length;
  const newLeads = db.leads.filter((l) => l.dealerId === dealer.id && l.stage === 'new').length;
  const liveCount = dealer.connections.filter((c) => c.connected && c.live).length;
  const ephemeral = storageMode() === 'ephemeral';

  return (
    <html lang="es">
      <body>
        {liveCount === 0 && (
          <div className="demo-banner">
            <span className="pill pill-warn">Modo demo</span>
            <span>
              Ninguna cuenta tiene credenciales reales todavía, así que las publicaciones se
              registran pero no salen a las plataformas. Conéctalas en <strong>Conexiones</strong>.
              {ephemeral && (
                <>
                  {' '}Además, este servidor no guarda en disco: los cambios duran mientras la
                  instancia siga viva.
                </>
              )}
            </span>
          </div>
        )}
        <div className="app">
          <Sidebar
            dealers={db.dealers.map((d) => ({ id: d.id, name: d.name, city: d.city }))}
            current={{ id: dealer.id, name: dealer.name, city: dealer.city }}
            pendingToday={pendingToday}
            newLeads={newLeads}
          />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}

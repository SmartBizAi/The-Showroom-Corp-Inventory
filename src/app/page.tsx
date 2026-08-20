import Link from 'next/link';
import { readDb, today } from '@/lib/store';
import { currentDealer } from '@/lib/session';
import { money, relativeTime, vehicleName, daysOnLot } from '@/lib/format';
import { platformMeta } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const dealer = await currentDealer();
  const db = readDb();
  const day = today();

  const vehicles = db.vehicles.filter((v) => v.dealerId === dealer.id);
  const available = vehicles.filter((v) => v.status === 'available');
  const queueToday = db.queue.filter((q) => q.dealerId === dealer.id && q.scheduledFor === day);
  const pending = queueToday.filter((q) => q.status === 'pending');
  const publishedToday = queueToday.filter((q) => q.status === 'published');
  const leads = db.leads.filter((l) => l.dealerId === dealer.id);
  const newLeads = leads.filter((l) => l.stage === 'new');
  const connected = dealer.connections.filter((c) => c.connected);

  const totalValue = available.reduce((sum, v) => sum + v.price, 0);
  const stale = available.filter((v) => daysOnLot(v) > 30);

  const byId = new Map(vehicles.map((v) => [v.id, v]));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{dealer.name}</h1>
          <p>
            Resumen de hoy · {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link href="/publicar" className="btn btn-primary btn-lg">
          {pending.length > 0 ? `Publicar hoy (${pending.length})` : 'Ver cola de hoy'}
        </Link>
      </div>

      <div className="stack">
        <div className="grid g4">
          <div className="card stat">
            <div className="label">Inventario</div>
            <div className="stat-v num">{available.length}</div>
            <div className="stat-l">disponibles · {money(totalValue)} en el lote</div>
          </div>
          <div className="card stat">
            <div className="label">Publicado hoy</div>
            <div className="stat-v num">{publishedToday.length}</div>
            <div className="stat-l">
              {pending.length > 0 ? `${pending.length} pendiente${pending.length === 1 ? '' : 's'}` : 'cola al día'}
            </div>
          </div>
          <div className="card stat">
            <div className="label">Clientes nuevos</div>
            <div className="stat-v num">{newLeads.length}</div>
            <div className="stat-l">{leads.length} en total este mes</div>
          </div>
          <div className="card stat">
            <div className="label">Canales activos</div>
            <div className="stat-v num">{connected.length}<span style={{ fontSize: 18, color: 'var(--ink-3)' }}>/{dealer.connections.length}</span></div>
            <div className="stat-l">{connected.filter((c) => c.live).length} con credenciales reales</div>
          </div>
        </div>

        <div className="grid g2">
          <section className="card">
            <div className="spread" style={{ marginBottom: 12 }}>
              <h2>Cola de hoy</h2>
              <Link href="/publicar" className="btn btn-sm">Abrir</Link>
            </div>
            {queueToday.length === 0 ? (
              <div className="empty" style={{ padding: '28px 10px' }}>
                <h3>Todavía no hay cola</h3>
                <p className="small">
                  Genera la cola del día desde <strong>Publicar hoy</strong> y la app reparte los
                  autos entre canales y vendedores.
                </p>
              </div>
            ) : (
              <div className="stack-sm">
                {queueToday.slice(0, 6).map((q) => {
                  const v = byId.get(q.vehicleId);
                  const meta = platformMeta(q.platform);
                  return (
                    <div key={q.id} className="spread" style={{ padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="small" style={{ fontWeight: 600 }}>
                          {v ? vehicleName(v) : 'Vehículo eliminado'}
                        </div>
                        <div className="tiny muted">{meta.label}</div>
                      </div>
                      <span className={`pill ${q.status === 'published' ? 'pill-ok' : q.status === 'skipped' ? 'pill-mut' : 'pill-accent'}`}>
                        {q.status === 'published' ? 'Publicado' : q.status === 'skipped' ? 'Omitido' : 'Pendiente'}
                      </span>
                    </div>
                  );
                })}
                {queueToday.length > 6 && (
                  <div className="tiny muted">y {queueToday.length - 6} más…</div>
                )}
              </div>
            )}
          </section>

          <section className="card">
            <div className="spread" style={{ marginBottom: 12 }}>
              <h2>Clientes esperando</h2>
              <Link href="/clientes" className="btn btn-sm">Abrir</Link>
            </div>
            {newLeads.length === 0 ? (
              <div className="empty" style={{ padding: '28px 10px' }}>
                <h3>Todo contestado</h3>
                <p className="small">No hay mensajes sin responder.</p>
              </div>
            ) : (
              <div className="stack-sm">
                {newLeads.slice(0, 5).map((l) => {
                  const v = l.vehicleId ? byId.get(l.vehicleId) : null;
                  return (
                    <Link
                      key={l.id}
                      href="/clientes"
                      style={{ textDecoration: 'none', color: 'inherit', padding: '7px 0', borderBottom: '1px solid var(--line)', display: 'block' }}
                    >
                      <div className="spread">
                        <div style={{ minWidth: 0 }}>
                          <div className="small" style={{ fontWeight: 600 }}>{l.name}</div>
                          <div className="tiny muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                            {l.messages[l.messages.length - 1]?.text}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flex: 'none' }}>
                          <span className="pill pill-accent">{l.channel === 'whatsapp' ? 'WhatsApp' : l.channel === 'messenger' ? 'Messenger' : 'Instagram'}</span>
                          <div className="tiny muted" style={{ marginTop: 3 }}>{v ? v.make : ''}</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {stale.length > 0 && (
          <section className="card">
            <h2 style={{ marginBottom: 4 }}>Autos que llevan mucho en el lote</h2>
            <p className="small muted" style={{ marginBottom: 12 }}>
              Más de 30 días sin venderse. Suelen necesitar ajuste de precio o fotos nuevas.
            </p>
            <div className="grid g3">
              {stale.slice(0, 3).map((v) => (
                <Link key={v.id} href={`/inventario/${v.id}`} className="card card-tight" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.photos[0]} alt="" className="thumb" />
                    <div style={{ minWidth: 0 }}>
                      <div className="small" style={{ fontWeight: 600 }}>{vehicleName(v)}</div>
                      <div className="tiny muted">{money(v.price)} · {daysOnLot(v)} días</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {publishedToday.length > 0 && (
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Actividad reciente</h2>
            <div className="stack-sm">
              {publishedToday
                .slice()
                .sort((a, b) => Date.parse(b.publishedAt ?? '') - Date.parse(a.publishedAt ?? ''))
                .slice(0, 5)
                .map((q) => {
                  const v = byId.get(q.vehicleId);
                  return (
                    <div key={q.id} className="row small" style={{ flexWrap: 'nowrap' }}>
                      <span className="pill pill-ok">✓</span>
                      <span style={{ fontWeight: 600 }}>{v ? vehicleName(v) : '—'}</span>
                      <span className="muted">en {platformMeta(q.platform).label}</span>
                      <span className="tiny muted" style={{ marginLeft: 'auto' }}>
                        {q.publishedAt ? relativeTime(q.publishedAt) : ''}
                      </span>
                    </div>
                  );
                })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

import Link from 'next/link';
import { readDb } from '@/lib/store';
import { currentDealer } from '@/lib/session';
import { money, miles, vehicleName, daysOnLot, STATUS_LABEL, STATUS_PILL, TITLE_LABEL } from '@/lib/format';
import { InventoryTools } from '@/components/InventoryTools';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const dealer = await currentDealer();
  const db = readDb();
  const vehicles = db.vehicles
    .filter((v) => v.dealerId === dealer.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const available = vehicles.filter((v) => v.status === 'available').length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Inventario</h1>
          <p>
            {vehicles.length} vehículo{vehicles.length === 1 ? '' : 's'} · {available} disponible
            {available === 1 ? '' : 's'}. Carga por VIN, por Excel o a mano.
          </p>
        </div>
      </div>

      <div className="stack">
        <InventoryTools />

        {vehicles.length === 0 ? (
          <div className="card empty">
            <h3>Este dealer todavía no tiene autos</h3>
            <p className="small">Sube un Excel o agrega el primero por VIN con los botones de arriba.</p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Precio</th>
                  <th>Millas</th>
                  <th>Título</th>
                  <th>Estado</th>
                  <th>Días</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link href={`/inventario/${v.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="row" style={{ flexWrap: 'nowrap' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={v.photos[0]} alt="" className="thumb" />
                          <div>
                            <div className="veh-name">{vehicleName(v)}</div>
                            <div className="veh-sub">
                              {v.stockNumber ? `Stock ${v.stockNumber}` : 'Sin stock #'}
                              {v.vin ? ` · ${v.vin.slice(-6)}` : ''}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="num" style={{ fontWeight: 650 }}>{money(v.price)}</td>
                    <td className="num">{miles(v.mileage)}</td>
                    <td>
                      <span className={`pill ${v.titleType === 'clean' ? 'pill-mut' : 'pill-warn'}`}>
                        {TITLE_LABEL[v.titleType]}
                      </span>
                    </td>
                    <td><span className={`pill ${STATUS_PILL[v.status]}`}>{STATUS_LABEL[v.status]}</span></td>
                    <td className="num muted">{daysOnLot(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

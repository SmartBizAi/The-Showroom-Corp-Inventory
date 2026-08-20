'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { dailyCap } from '@/lib/types';

interface Seller {
  id: string;
  name: string;
  dailyLimit: number;
  seasoned: boolean;
}

interface Props {
  dealer: {
    id: string;
    name: string;
    city: string;
    phone: string;
    tone: string;
    financing: boolean;
  };
  sellers: Seller[];
  dealerCount: number;
  vehicleCount: number;
}

export function SettingsPanel({ dealer, sellers, dealerCount, vehicleCount }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [form, setForm] = useState({ ...dealer });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [newSeller, setNewSeller] = useState('');
  const [showNewDealer, setShowNewDealer] = useState(false);
  const [nd, setNd] = useState({ name: '', city: 'Miami, FL', phone: '', copySellers: true });

  const dirty =
    form.name !== dealer.name ||
    form.city !== dealer.city ||
    form.phone !== dealer.phone ||
    form.tone !== dealer.tone ||
    form.financing !== dealer.financing;

  async function patch(body: Record<string, unknown>, msg: string) {
    setBusy(true);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    setNote(msg);
    startTransition(() => router.refresh());
  }

  async function createDealer() {
    if (nd.name.trim() === '') return;
    setBusy(true);
    await fetch('/api/dealers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: nd.name,
        city: nd.city,
        phone: nd.phone,
        copySellersFrom: nd.copySellers ? dealer.id : null,
      }),
    });
    setBusy(false);
    setShowNewDealer(false);
    setNd({ name: '', city: 'Miami, FL', phone: '', copySellers: true });
    setNote('Workspace creado y activado. Ahora conecta sus cuentas en Conexiones.');
    startTransition(() => router.refresh());
  }

  async function resetDemo() {
    if (!confirm('Esto borra todos los workspaces y vuelve la demo a su estado inicial. ¿Seguir?')) return;
    setBusy(true);
    await fetch('/api/reset', { method: 'POST' });
    setBusy(false);
    setNote('Demo reiniciada.');
    startTransition(() => router.refresh());
  }

  return (
    <div className="stack">
      {note && <div className="notice notice-ok">{note}</div>}

      <section className="card">
        <h2 style={{ marginBottom: 4 }}>Pasar la demo a un cliente</h2>
        <p className="small muted" style={{ marginBottom: 14, maxWidth: '68ch' }}>
          Crea un workspace vacío con el nombre del dealer. Queda activo al instante y con sus
          propias cuentas, inventario y clientes — el tuyo se conserva intacto y puedes volver desde
          el selector de arriba a la izquierda.
        </p>

        {showNewDealer ? (
          <div className="stack-sm" style={{ maxWidth: 560 }}>
            <div className="grid g2">
              <label className="field">
                <span>Nombre del dealer *</span>
                <input
                  type="text"
                  value={nd.name}
                  placeholder="Ej. Miami Auto Sales"
                  onChange={(e) => setNd((s) => ({ ...s, name: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Ciudad</span>
                <input type="text" value={nd.city} onChange={(e) => setNd((s) => ({ ...s, city: e.target.value }))} />
              </label>
            </div>
            <label className="field">
              <span>Teléfono</span>
              <input
                type="tel"
                value={nd.phone}
                placeholder="+1 (305) 555-0100"
                onChange={(e) => setNd((s) => ({ ...s, phone: e.target.value }))}
              />
            </label>
            <label className="row small" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={nd.copySellers}
                onChange={(e) => setNd((s) => ({ ...s, copySellers: e.target.checked }))}
              />
              Copiar la lista de vendedores de {dealer.name}
            </label>
            <div className="row">
              <button className="btn btn-primary" onClick={createDealer} disabled={busy || nd.name.trim() === ''}>
                {busy ? 'Creando…' : 'Crear workspace'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowNewDealer(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="row">
            <button className="btn btn-primary" onClick={() => setShowNewDealer(true)}>
              + Nuevo workspace de dealer
            </button>
            <span className="small muted">
              {dealerCount} workspace{dealerCount === 1 ? '' : 's'} en esta demo
            </span>
          </div>
        )}
      </section>

      <div className="grid g2">
        <section className="card">
          <h2 style={{ marginBottom: 14 }}>Datos del dealer</h2>
          <div className="stack-sm">
            <label className="field">
              <span>Nombre</span>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </label>
            <div className="grid g2">
              <label className="field">
                <span>Ciudad</span>
                <input type="text" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </label>
              <label className="field">
                <span>Teléfono</span>
                <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </label>
            </div>
            <label className="field">
              <span>Voz de los anuncios</span>
              <textarea
                value={form.tone}
                style={{ minHeight: 74 }}
                onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
              />
            </label>
            <label className="row small" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={form.financing}
                onChange={(e) => setForm((f) => ({ ...f, financing: e.target.checked }))}
              />
              Mencionar financiamiento en los anuncios
            </label>
            <button
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start' }}
              disabled={!dirty || busy}
              onClick={() =>
                patch(
                  { dealer: { name: form.name, city: form.city, phone: form.phone, tone: form.tone, financing: form.financing } },
                  'Datos del dealer guardados.',
                )
              }
            >
              Guardar cambios
            </button>
          </div>
        </section>

        <section className="card">
          <h2 style={{ marginBottom: 4 }}>Vendedores en Marketplace</h2>
          <p className="small muted" style={{ marginBottom: 14 }}>
            Cada vendedor publica desde su propia cuenta personal. El límite diario protege esas
            cuentas: 3 al día si es nueva, hasta 8 si ya tiene antigüedad.
          </p>

          <div className="stack-sm">
            {sellers.map((s) => (
              <div key={s.id} className="card card-tight">
                <div className="spread" style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: 14 }}>{s.name}</strong>
                  <button
                    className="btn btn-sm btn-ghost"
                    disabled={busy}
                    onClick={() => patch({ removeSellerId: s.id }, `${s.name} eliminado.`)}
                  >
                    Quitar
                  </button>
                </div>
                <div className="row" style={{ gap: 12 }}>
                  <label className="row tiny" style={{ gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={s.seasoned}
                      disabled={busy}
                      onChange={(e) =>
                        patch(
                          { updateSeller: { id: s.id, seasoned: e.target.checked } },
                          `Cuenta de ${s.name} actualizada.`,
                        )
                      }
                    />
                    Cuenta con antigüedad
                  </label>
                  <span className="pill pill-mut">
                    {dailyCap(s.seasoned, s.dailyLimit)} autos/día
                  </span>
                </div>
              </div>
            ))}

            {sellers.length === 0 && (
              <p className="small muted">
                Sin vendedores. Agrega al menos uno para que Marketplace entre en la cola diaria.
              </p>
            )}

            <div className="row" style={{ flexWrap: 'nowrap', marginTop: 4 }}>
              <input
                type="text"
                value={newSeller}
                placeholder="Nombre del vendedor"
                onChange={(e) => setNewSeller(e.target.value)}
              />
              <button
                className="btn"
                disabled={busy || newSeller.trim() === ''}
                onClick={() => {
                  const name = newSeller.trim();
                  setNewSeller('');
                  void patch({ addSeller: { name } }, `${name} agregado.`);
                }}
              >
                Agregar
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="card">
        <h2 style={{ marginBottom: 4 }}>Datos de la demo</h2>
        <p className="small muted" style={{ marginBottom: 14 }}>
          Este workspace tiene {vehicleCount} vehículo{vehicleCount === 1 ? '' : 's'}. Todo vive en{' '}
          <code>data/db.json</code> — puedes borrar ese archivo y la demo se reconstruye sola.
        </p>
        <button className="btn btn-danger" onClick={resetDemo} disabled={busy}>
          Reiniciar la demo a su estado inicial
        </button>
      </section>
    </div>
  );
}

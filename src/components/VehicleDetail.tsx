'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Lane, Platform, VehicleStatus } from '@/lib/types';

interface Props {
  vehicle: {
    id: string;
    name: string;
    price: number;
    status: VehicleStatus;
    photos: string[];
    vin: string | null;
    stockNumber: string | null;
    transmission: string | null;
    fuel: string | null;
    exteriorColor: string | null;
    features: string[];
  };
  platforms: { id: Platform; label: string; lane: Lane }[];
  captions: { platform: Platform; lang: 'es' | 'en'; text: string; source: string }[];
  publishedCount: number;
}

const STATUS_OPTIONS: { value: VehicleStatus; label: string }[] = [
  { value: 'available', label: 'Disponible' },
  { value: 'reserved', label: 'Apartado' },
  { value: 'shop', label: 'En mecánica' },
  { value: 'sold', label: 'Vendido' },
];

export function VehicleDetail({ vehicle, platforms, captions, publishedCount }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [platform, setPlatform] = useState<Platform>('marketplace');
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'warn' | 'info'; text: string } | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [price, setPrice] = useState(String(vehicle.price));
  const [copied, setCopied] = useState(false);

  const current = captions.find((c) => c.platform === platform && c.lang === lang);
  const shown = draft ?? current?.text ?? '';

  async function generate() {
    setBusy(true);
    setNote(null);
    setDraft(null);
    const res = await fetch('/api/captions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vehicleId: vehicle.id, platform }),
    });
    const data = (await res.json()) as { warning?: string; source?: string };
    setBusy(false);
    setNote(
      data.warning
        ? { kind: 'warn', text: data.warning }
        : { kind: 'ok', text: data.source === 'ai' ? 'Generado con IA en los dos idiomas.' : 'Generado con plantilla en los dos idiomas.' },
    );
    startTransition(() => router.refresh());
  }

  async function saveEdit() {
    if (draft === null) return;
    setBusy(true);
    await fetch('/api/captions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vehicleId: vehicle.id, platform, lang, text: draft }),
    });
    setBusy(false);
    setDraft(null);
    setNote({ kind: 'ok', text: 'Anuncio guardado.' });
    startTransition(() => router.refresh());
  }

  async function patchVehicle(patch: Record<string, unknown>, msg: string) {
    setBusy(true);
    await fetch(`/api/vehicles/${vehicle.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setBusy(false);
    setNote({ kind: 'ok', text: msg });
    startTransition(() => router.refresh());
  }

  async function copy() {
    if (!shown) return;
    try {
      await navigator.clipboard.writeText(shown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="stack">
      {note && <div className={`notice notice-${note.kind === 'ok' ? 'ok' : note.kind === 'warn' ? 'warn' : 'info'}`}>{note.text}</div>}

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)' }}>
        <div className="stack">
          <div className="card card-tight">
            <div className="stack-sm">
              {vehicle.photos.slice(0, 2).map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p} alt="" className="thumb-lg" />
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Ficha</h3>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '7px 14px', fontSize: 13.5 }}>
              <dt className="muted">VIN</dt>
              <dd style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 12 }}>{vehicle.vin ?? '—'}</dd>
              <dt className="muted">Stock</dt>
              <dd style={{ margin: 0 }}>{vehicle.stockNumber ?? '—'}</dd>
              <dt className="muted">Transmisión</dt>
              <dd style={{ margin: 0 }}>{vehicle.transmission ?? '—'}</dd>
              <dt className="muted">Combustible</dt>
              <dd style={{ margin: 0 }}>{vehicle.fuel ?? '—'}</dd>
              <dt className="muted">Color</dt>
              <dd style={{ margin: 0 }}>{vehicle.exteriorColor ?? '—'}</dd>
              <dt className="muted">Publicado</dt>
              <dd style={{ margin: 0 }}>{publishedCount} {publishedCount === 1 ? 'vez' : 'veces'}</dd>
            </dl>
            {vehicle.features.length > 0 && (
              <div className="row" style={{ marginTop: 12, gap: 6 }}>
                {vehicle.features.map((f) => (
                  <span key={f} className="pill pill-mut">{f}</span>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Estado y precio</h3>
            <div className="stack-sm">
              <label className="field">
                <span>Estado</span>
                <select
                  value={vehicle.status}
                  disabled={busy}
                  onChange={(e) =>
                    patchVehicle(
                      { status: e.target.value },
                      e.target.value === 'sold'
                        ? 'Marcado como vendido. Se quitó de la cola — acuérdate de borrarlo de Marketplace en menos de 24 h.'
                        : 'Estado actualizado.',
                    )
                  }
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Precio (USD)</span>
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
                  <button
                    className="btn"
                    disabled={busy || Number(price) === vehicle.price || price.trim() === ''}
                    onClick={() => patchVehicle({ price: Number(price) }, 'Precio actualizado.')}
                  >
                    Guardar
                  </button>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="spread" style={{ marginBottom: 6 }}>
            <h3>Anuncios por canal</h3>
            {current && <span className="pill pill-mut">{current.source === 'ai' ? 'Generado con IA' : current.source === 'manual' ? 'Editado a mano' : 'Plantilla'}</span>}
          </div>
          <p className="small muted" style={{ marginBottom: 12 }}>
            Cada canal tiene su formato: Marketplace corto, Instagram con hashtags, CarGurus
            descripción larga. Siempre en español e inglés.
          </p>

          <div className="tabs">
            {platforms.map((p) => (
              <button
                key={p.id}
                data-active={platform === p.id}
                onClick={() => { setPlatform(p.id); setDraft(null); }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="row" style={{ marginBottom: 10 }}>
            <div className="tabs" style={{ border: 'none', margin: 0 }}>
              <button data-active={lang === 'es'} onClick={() => { setLang('es'); setDraft(null); }}>Español</button>
              <button data-active={lang === 'en'} onClick={() => { setLang('en'); setDraft(null); }}>English</button>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={generate} disabled={busy}>
                {busy ? 'Generando…' : current ? 'Regenerar' : 'Generar ES/EN'}
              </button>
              {shown && (
                <button className="btn btn-sm" onClick={copy}>{copied ? '✓ Copiado' : 'Copiar'}</button>
              )}
            </div>
          </div>

          {current || draft !== null ? (
            <>
              <textarea
                value={shown}
                onChange={(e) => setDraft(e.target.value)}
                style={{ minHeight: 230 }}
              />
              {draft !== null && draft !== current?.text && (
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={busy}>Guardar cambios</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>Descartar</button>
                </div>
              )}
            </>
          ) : (
            <div className="empty" style={{ padding: '34px 16px' }}>
              <h3>Sin anuncio para este canal</h3>
              <p className="small">Pulsa <strong>Generar ES/EN</strong> y lo escribe en los dos idiomas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { DecodedVin } from '@/lib/vin';

interface ImportReport {
  created: number;
  updated: number;
  errors: { row: number; reason: string }[];
  unmatchedHeaders: string[];
}

const BLANK = {
  vin: '',
  stockNumber: '',
  year: '',
  make: '',
  model: '',
  trim: '',
  mileage: '',
  price: '',
  exteriorColor: '',
  transmission: '',
  fuel: '',
  features: '',
  titleType: 'clean' as 'clean' | 'rebuilt' | 'salvage',
};

export function InventoryTools() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [panel, setPanel] = useState<'none' | 'add'>('none');
  const [form, setForm] = useState({ ...BLANK });
  const [decoding, setDecoding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  const set = (k: keyof typeof BLANK, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function decode() {
    setDecoding(true);
    setNote(null);
    const res = await fetch(`/api/vin/${encodeURIComponent(form.vin.trim())}`);
    const data = (await res.json()) as { ok?: boolean; data?: DecodedVin; error?: string };
    setDecoding(false);

    if (!data.ok || !data.data) {
      setNote({ kind: 'warn', text: data.error ?? 'No se pudo leer el VIN.' });
      return;
    }
    const d = data.data;
    setForm((f) => ({
      ...f,
      year: d.year ? String(d.year) : f.year,
      make: d.make ?? f.make,
      model: d.model ?? f.model,
      trim: d.trim ?? f.trim,
      transmission: d.transmission ?? f.transmission,
      fuel: d.fuel ?? f.fuel,
    }));
    setNote({ kind: 'ok', text: `VIN leído: ${[d.year, d.make, d.model].filter(Boolean).join(' ')}` });
  }

  async function save() {
    setSaving(true);
    setNote(null);
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        vin: form.vin.trim() || null,
        stockNumber: form.stockNumber.trim() || null,
        year: Number(form.year),
        make: form.make.trim(),
        model: form.model.trim(),
        trim: form.trim.trim() || null,
        mileage: Number(form.mileage) || 0,
        price: Number(form.price) || 0,
        titleType: form.titleType,
        transmission: form.transmission.trim() || null,
        fuel: form.fuel.trim() || null,
        exteriorColor: form.exteriorColor.trim() || null,
        features: form.features.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setSaving(false);

    if (!data.ok) {
      setNote({ kind: 'warn', text: data.error ?? 'No se pudo guardar.' });
      return;
    }
    setForm({ ...BLANK });
    setPanel('none');
    setNote({ kind: 'ok', text: 'Vehículo agregado al inventario.' });
    startTransition(() => router.refresh());
  }

  async function upload(file: File) {
    setImporting(true);
    setNote(null);
    setReport(null);

    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/import', { method: 'POST', body });
    const data = (await res.json()) as { ok?: boolean; report?: ImportReport; error?: string };
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';

    if (!data.ok || !data.report) {
      setNote({ kind: 'warn', text: data.error ?? 'No se pudo importar el archivo.' });
      return;
    }
    setReport(data.report);
    startTransition(() => router.refresh());
  }

  const canSave = form.make.trim() !== '' && form.model.trim() !== '' && form.year.trim() !== '';

  return (
    <div className="stack">
      <div className="card card-tight row">
        <button className="btn btn-primary" onClick={() => setPanel(panel === 'add' ? 'none' : 'add')}>
          {panel === 'add' ? 'Cerrar' : '+ Agregar auto'}
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()} disabled={importing}>
          {importing ? 'Importando…' : 'Importar Excel / CSV'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <span className="tiny muted" style={{ marginLeft: 'auto' }}>
          El Excel acepta columnas en inglés o español (Make/Marca, Price/Precio…)
        </span>
      </div>

      {note && <div className={`notice notice-${note.kind === 'ok' ? 'ok' : 'warn'}`}>{note.text}</div>}

      {report && (
        <div className={`notice notice-${report.errors.length > 0 ? 'warn' : 'ok'}`}>
          <strong>
            Importación terminada: {report.created} nuevos, {report.updated} actualizados
            {report.errors.length > 0 ? `, ${report.errors.length} con problemas` : ''}.
          </strong>
          {report.errors.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              {report.errors.slice(0, 6).map((e) => (
                <li key={e.row} className="small">Fila {e.row}: {e.reason}</li>
              ))}
              {report.errors.length > 6 && (
                <li className="small">y {report.errors.length - 6} más…</li>
              )}
            </ul>
          )}
          {report.unmatchedHeaders.length > 0 && (
            <p className="tiny" style={{ marginTop: 8 }}>
              Columnas que no se reconocieron: {report.unmatchedHeaders.join(', ')}
            </p>
          )}
        </div>
      )}

      {panel === 'add' && (
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Agregar vehículo</h3>
          <p className="small muted" style={{ marginBottom: 14 }}>
            Pon el VIN y pulsa Leer VIN: año, marca, modelo y motor se llenan solos desde la base
            del gobierno (NHTSA). También puedes escribirlo todo a mano.
          </p>

          <div className="grid g3" style={{ marginBottom: 12 }}>
            <label className="field" style={{ gridColumn: 'span 2' }}>
              <span>VIN</span>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input
                  type="text"
                  value={form.vin}
                  placeholder="4T1B11HK5KU123456"
                  onChange={(e) => set('vin', e.target.value.toUpperCase())}
                />
                <button className="btn" onClick={decode} disabled={decoding || form.vin.trim().length < 17}>
                  {decoding ? '…' : 'Leer VIN'}
                </button>
              </div>
            </label>
            <label className="field">
              <span>Stock #</span>
              <input type="text" value={form.stockNumber} onChange={(e) => set('stockNumber', e.target.value)} />
            </label>
          </div>

          <div className="grid g4" style={{ marginBottom: 12 }}>
            <label className="field">
              <span>Año *</span>
              <input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} />
            </label>
            <label className="field">
              <span>Marca *</span>
              <input type="text" value={form.make} onChange={(e) => set('make', e.target.value)} />
            </label>
            <label className="field">
              <span>Modelo *</span>
              <input type="text" value={form.model} onChange={(e) => set('model', e.target.value)} />
            </label>
            <label className="field">
              <span>Versión</span>
              <input type="text" value={form.trim} onChange={(e) => set('trim', e.target.value)} />
            </label>
          </div>

          <div className="grid g4" style={{ marginBottom: 12 }}>
            <label className="field">
              <span>Millas</span>
              <input type="number" value={form.mileage} onChange={(e) => set('mileage', e.target.value)} />
            </label>
            <label className="field">
              <span>Precio (USD)</span>
              <input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} />
            </label>
            <label className="field">
              <span>Título</span>
              <select value={form.titleType} onChange={(e) => set('titleType', e.target.value)}>
                <option value="clean">Limpio</option>
                <option value="rebuilt">Rebuilt</option>
                <option value="salvage">Salvage</option>
              </select>
            </label>
            <label className="field">
              <span>Color</span>
              <input type="text" value={form.exteriorColor} onChange={(e) => set('exteriorColor', e.target.value)} />
            </label>
          </div>

          <label className="field" style={{ marginBottom: 14 }}>
            <span>Equipamiento (separado por comas)</span>
            <input
              type="text"
              value={form.features}
              placeholder="Cámara de reversa, CarPlay, Asientos de piel"
              onChange={(e) => set('features', e.target.value)}
            />
          </label>

          <div className="row">
            <button className="btn btn-primary" onClick={save} disabled={!canSave || saving}>
              {saving ? 'Guardando…' : 'Guardar vehículo'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setForm({ ...BLANK }); setPanel('none'); }}>
              Cancelar
            </button>
            {!canSave && <span className="tiny muted">Año, marca y modelo son obligatorios</span>}
          </div>
        </div>
      )}
    </div>
  );
}

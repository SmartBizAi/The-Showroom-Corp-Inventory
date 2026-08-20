'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Lane, Platform } from '@/lib/types';

interface Row {
  platform: Platform;
  label: string;
  lane: Lane;
  note: string;
  accountHint: string;
  connected: boolean;
  accountName: string | null;
  live: boolean;
}

const LANE_PILL: Record<Lane, string> = {
  official: 'lane-official',
  feed: 'lane-feed',
  assisted: 'lane-assisted',
};

const LANE_LABEL: Record<Lane, string> = {
  official: 'API oficial · automático',
  feed: 'Feed de inventario · automático',
  assisted: 'Asistido · 1 click del vendedor',
};

export function ConnectionsBoard({ rows, dealerName }: { rows: Row[]; dealerName: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<Platform | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);

  async function patch(platform: Platform, body: Record<string, unknown>, msg: string) {
    setBusy(platform);
    const res = await fetch('/api/connections', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ platform, ...body }),
    });
    const data = (await res.json()) as { hasCredentials?: boolean };
    setBusy(null);
    setNote(
      data.hasCredentials === false && body.connected === true
        ? `${msg} Queda en modo demo: no hay credenciales configuradas para este canal todavía.`
        : msg,
    );
    startTransition(() => router.refresh());
  }

  const connectedCount = rows.filter((r) => r.connected).length;
  const liveCount = rows.filter((r) => r.live).length;

  return (
    <div className="stack">
      {note && <div className="notice notice-info">{note}</div>}

      <div className="card card-tight row">
        <span className="pill pill-accent">{connectedCount} de {rows.length} conectados</span>
        <span className="pill pill-mut">{liveCount} con credenciales reales</span>
        <span className="small muted" style={{ marginLeft: 'auto' }}>
          Workspace: <strong>{dealerName}</strong>
        </span>
      </div>

      <div className="notice notice-accent">
        <strong>Cómo funciona el modo demo.</strong> Puedes conectar cuentas con el nombre real y
        probar todo el flujo — lo único que falta para que las publicaciones salgan de verdad son
        las credenciales de cada API en el archivo <code>.env.local</code>. Marketplace nunca lleva
        credenciales: publica el vendedor desde su navegador, y ese es justamente el diseño.
      </div>

      <div className="grid g2">
        {rows.map((r) => (
          <article key={r.platform} className="card">
            <div className="spread" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
              <div>
                <h3>{r.label}</h3>
                <span className={`pill ${LANE_PILL[r.lane]}`} style={{ marginTop: 5, display: 'inline-block' }}>
                  {LANE_LABEL[r.lane]}
                </span>
              </div>
              <span className={`pill ${r.connected ? (r.live ? 'pill-ok' : 'pill-warn') : 'pill-mut'}`}>
                {r.connected ? (r.live ? 'En vivo' : 'Demo') : 'Sin conectar'}
              </span>
            </div>

            <p className="small muted" style={{ marginBottom: 14 }}>{r.note}</p>

            {r.connected ? (
              <div className="stack-sm">
                <label className="field">
                  <span>Cuenta</span>
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <input
                      type="text"
                      value={drafts[r.platform] ?? r.accountName ?? ''}
                      placeholder={r.accountHint}
                      onChange={(e) => setDrafts((d) => ({ ...d, [r.platform]: e.target.value }))}
                    />
                    <button
                      className="btn"
                      disabled={busy === r.platform || (drafts[r.platform] ?? r.accountName ?? '') === (r.accountName ?? '')}
                      onClick={() => patch(r.platform, { accountName: drafts[r.platform] ?? '' }, `Cuenta de ${r.label} actualizada.`)}
                    >
                      Guardar
                    </button>
                  </div>
                </label>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ alignSelf: 'flex-start' }}
                  disabled={busy === r.platform}
                  onClick={() => {
                    setDrafts((d) => ({ ...d, [r.platform]: '' }));
                    void patch(r.platform, { connected: false }, `${r.label} desconectado.`);
                  }}
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <div className="stack-sm">
                <label className="field">
                  <span>Cuenta a conectar</span>
                  <input
                    type="text"
                    value={drafts[r.platform] ?? ''}
                    placeholder={r.accountHint}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.platform]: e.target.value }))}
                  />
                </label>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ alignSelf: 'flex-start' }}
                  disabled={busy === r.platform || (drafts[r.platform] ?? '').trim() === ''}
                  onClick={() =>
                    patch(
                      r.platform,
                      { connected: true, accountName: drafts[r.platform] },
                      `${r.label} conectado.`,
                    )
                  }
                >
                  {busy === r.platform ? 'Conectando…' : 'Conectar'}
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

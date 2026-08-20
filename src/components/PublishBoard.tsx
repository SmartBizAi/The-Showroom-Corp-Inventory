'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Lane, Platform, QueueStatus } from '@/lib/types';

export interface QueueCardData {
  id: string;
  status: QueueStatus;
  platform: Platform;
  platformLabel: string;
  lane: Lane;
  listingUrl: string | null;
  sellerName: string | null;
  vehicleId: string;
  vehicleName: string;
  vehiclePrice: string;
  vehicleMiles: string;
  photo: string;
  photoCount: number;
  captionEs: string | null;
  captionEn: string | null;
}

interface Props {
  items: QueueCardData[];
  sellers: { id: string; name: string }[];
  connectedCount: number;
  dealerName: string;
}

const LANE_PILL: Record<Lane, string> = {
  official: 'lane-official',
  feed: 'lane-feed',
  assisted: 'lane-assisted',
};

const LANE_LABEL: Record<Lane, string> = {
  official: 'Automático',
  feed: 'Feed diario',
  assisted: '1 click',
};

export function PublishBoard({ items, sellers, connectedCount, dealerName }: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: 'ok' | 'warn' | 'info'; text: string } | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const assisted = useMemo(() => items.filter((i) => i.lane === 'assisted'), [items]);
  const automatic = useMemo(() => items.filter((i) => i.lane !== 'assisted'), [items]);
  const pendingAssisted = assisted.filter((i) => i.status === 'pending');
  const donePendingCount = items.filter((i) => i.status === 'pending').length;

  async function buildQueue() {
    setWorking('build');
    const res = await fetch('/api/queue/build', { method: 'POST' });
    const data = (await res.json()) as { created: number; skippedPlatforms: string[] };
    setWorking(null);

    if (data.created === 0 && data.skippedPlatforms.length > 0) {
      setMessage({
        kind: 'warn',
        text: `No se generó nada. Sin conectar: ${data.skippedPlatforms.join(', ')}. Conéctalos en Conexiones.`,
      });
    } else if (data.created === 0) {
      setMessage({ kind: 'info', text: 'La cola de hoy ya está completa — no había nada que agregar.' });
    } else {
      setMessage({
        kind: 'ok',
        text:
          `Se agregaron ${data.created} publicaciones a la cola de hoy.` +
          (data.skippedPlatforms.length > 0 ? ` Sin conectar: ${data.skippedPlatforms.join(', ')}.` : ''),
      });
    }
    startTransition(() => router.refresh());
  }

  async function act(id: string, action: 'publish' | 'skip' | 'reset') {
    setWorking(id);
    const res = await fetch(`/api/queue/${id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = (await res.json()) as { live?: boolean; platform?: string };
    setWorking(null);

    if (action === 'publish') {
      setMessage(
        data.live
          ? { kind: 'ok', text: `Publicado en ${data.platform}.` }
          : {
              kind: 'info',
              text: `Registrado como publicado en ${data.platform}. En modo demo no sale a la plataforma real — conecta las credenciales para que salga de verdad.`,
            },
      );
    }
    startTransition(() => router.refresh());
  }

  async function generateCaptions(vehicleId: string, platform: Platform, id: string) {
    setWorking(id);
    const res = await fetch('/api/captions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vehicleId, platform }),
    });
    const data = (await res.json()) as { source?: string; warning?: string };
    setWorking(null);
    setMessage(
      data.warning
        ? { kind: 'warn', text: data.warning }
        : { kind: 'ok', text: data.source === 'ai' ? 'Anuncio generado con IA en español e inglés.' : 'Anuncio generado con plantilla en español e inglés.' },
    );
    startTransition(() => router.refresh());
  }

  if (items.length === 0) {
    return (
      <div className="stack">
        {message && <div className={`notice notice-${message.kind === 'ok' ? 'ok' : message.kind === 'warn' ? 'warn' : 'info'}`}>{message.text}</div>}
        <div className="card empty">
          <h3>La cola de hoy está vacía</h3>
          <p className="small" style={{ maxWidth: '52ch', margin: '0 auto 18px' }}>
            Genera la cola y la app reparte el inventario entre los canales conectados y los
            vendedores, respetando el límite diario de cada cuenta.
          </p>
          <button className="btn btn-primary btn-lg" onClick={buildQueue} disabled={working === 'build'}>
            {working === 'build' ? 'Generando…' : 'Generar la cola de hoy'}
          </button>
          {connectedCount === 0 && (
            <p className="tiny muted" style={{ marginTop: 14 }}>
              No tienes canales conectados todavía. <Link href="/conexiones">Conéctalos aquí</Link>.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      {message && (
        <div className={`notice notice-${message.kind === 'ok' ? 'ok' : message.kind === 'warn' ? 'warn' : 'info'}`}>
          {message.text}
        </div>
      )}

      <div className="card card-tight spread">
        <div className="row">
          <span className="pill pill-accent">{donePendingCount} pendientes</span>
          <span className="small muted">
            {items.length} publicaciones programadas hoy para {dealerName}
          </span>
        </div>
        <button className="btn" onClick={buildQueue} disabled={working === 'build' || busy}>
          {working === 'build' ? 'Actualizando…' : 'Actualizar cola'}
        </button>
      </div>

      {automatic.length > 0 && (
        <section>
          <div className="spread" style={{ marginBottom: 10 }}>
            <h2>Sale solo</h2>
            <span className="small muted">Canales con vía oficial — nadie tiene que hacer nada</span>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Canal</th>
                  <th>Modo</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {automatic.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <div className="row" style={{ flexWrap: 'nowrap' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={i.photo} alt="" className="thumb" />
                        <div>
                          <div className="veh-name">{i.vehicleName}</div>
                          <div className="veh-sub">{i.vehiclePrice} · {i.vehicleMiles}</div>
                        </div>
                      </div>
                    </td>
                    <td>{i.platformLabel}</td>
                    <td><span className={`pill ${LANE_PILL[i.lane]}`}>{LANE_LABEL[i.lane]}</span></td>
                    <td>
                      <span className={`pill ${i.status === 'published' ? 'pill-ok' : i.status === 'skipped' ? 'pill-mut' : 'pill-accent'}`}>
                        {i.status === 'published' ? 'Publicado' : i.status === 'skipped' ? 'Omitido' : 'Programado'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {i.status === 'pending' ? (
                        <button className="btn btn-sm" onClick={() => act(i.id, 'publish')} disabled={working === i.id}>
                          {working === i.id ? '…' : 'Publicar ahora'}
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-ghost" onClick={() => act(i.id, 'reset')} disabled={working === i.id}>
                          Deshacer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {assisted.length > 0 && (
        <section>
          <div className="spread" style={{ marginBottom: 4 }}>
            <h2>Marketplace — {pendingAssisted.length} por publicar</h2>
            <span className="small muted">
              {sellers.length} vendedor{sellers.length === 1 ? '' : 'es'} · ~1 min por auto
            </span>
          </div>
          <p className="small muted" style={{ marginBottom: 12, maxWidth: '72ch' }}>
            Copia el anuncio, abre Marketplace y pega. El vendedor publica desde su propia cuenta —
            así es como Facebook permite que un dealer publique, y las cuentas quedan protegidas.
          </p>

          <div className="grid g2">
            {assisted.map((i) => (
              <AssistedCard
                key={i.id}
                item={i}
                busy={working === i.id}
                onPublish={() => act(i.id, 'publish')}
                onSkip={() => act(i.id, 'skip')}
                onReset={() => act(i.id, 'reset')}
                onGenerate={() => generateCaptions(i.vehicleId, i.platform, i.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AssistedCard({
  item,
  busy,
  onPublish,
  onSkip,
  onReset,
  onGenerate,
}: {
  item: QueueCardData;
  busy: boolean;
  onPublish: () => void;
  onSkip: () => void;
  onReset: () => void;
  onGenerate: () => void;
}) {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const [copied, setCopied] = useState(false);
  const caption = lang === 'es' ? item.captionEs : item.captionEn;

  async function copy() {
    if (!caption) return;
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="q-card" style={item.status !== 'pending' ? { opacity: 0.72 } : undefined}>
      <div className="q-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.photo} alt="" style={{ width: 88, height: 62, borderRadius: 8, objectFit: 'cover', flex: 'none' }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="spread" style={{ alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 650, fontSize: 14.5 }}>{item.vehicleName}</div>
              <div className="tiny muted">
                {item.vehiclePrice} · {item.vehicleMiles} · {item.photoCount} foto{item.photoCount === 1 ? '' : 's'}
              </div>
            </div>
            <span className={`pill ${item.status === 'published' ? 'pill-ok' : item.status === 'skipped' ? 'pill-mut' : 'pill-warn'}`}>
              {item.status === 'published' ? 'Publicado' : item.status === 'skipped' ? 'Omitido' : item.sellerName ?? 'Pendiente'}
            </span>
          </div>
        </div>
      </div>

      <div className="q-body">
        <div className="tabs">
          <button data-active={lang === 'es'} onClick={() => setLang('es')}>Español</button>
          <button data-active={lang === 'en'} onClick={() => setLang('en')}>English</button>
        </div>
        {caption ? (
          <div className="caption-box">{caption}</div>
        ) : (
          <div className="caption-box muted" style={{ fontStyle: 'italic' }}>
            Este auto todavía no tiene anuncio escrito. Genéralo en un click.
          </div>
        )}
      </div>

      <div className="q-foot">
        {caption ? (
          <>
            <button className="btn btn-sm" onClick={copy}>
              {copied ? '✓ Copiado' : 'Copiar anuncio'}
            </button>
            <a
              className="btn btn-sm"
              href="https://www.facebook.com/marketplace/create/vehicle"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir Marketplace ↗
            </a>
          </>
        ) : (
          <button className="btn btn-sm" onClick={onGenerate} disabled={busy}>
            {busy ? 'Generando…' : 'Generar anuncio ES/EN'}
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {item.status === 'pending' ? (
            <>
              <button className="btn btn-sm btn-ghost" onClick={onSkip} disabled={busy}>Hoy no</button>
              <button className="btn btn-sm btn-primary" onClick={onPublish} disabled={busy}>
                {busy ? '…' : 'Ya lo publiqué'}
              </button>
            </>
          ) : (
            <button className="btn btn-sm btn-ghost" onClick={onReset} disabled={busy}>Deshacer</button>
          )}
        </div>
      </div>
    </article>
  );
}

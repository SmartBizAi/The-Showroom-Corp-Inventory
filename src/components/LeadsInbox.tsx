'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { LeadStage } from '@/lib/types';
import { relativeTime } from '@/lib/format';

export interface LeadCard {
  id: string;
  name: string;
  channel: 'messenger' | 'instagram' | 'whatsapp';
  handle: string;
  stage: LeadStage;
  lang: 'es' | 'en';
  vehicleName: string | null;
  vehiclePhoto: string | null;
  messages: { from: 'lead' | 'dealer'; text: string; at: string }[];
}

const CHANNEL_LABEL = { messenger: 'Messenger', instagram: 'Instagram', whatsapp: 'WhatsApp' } as const;

const STAGES: { value: LeadStage; label: string; pill: string }[] = [
  { value: 'new', label: 'Nuevo', pill: 'pill-accent' },
  { value: 'contacted', label: 'Contactado', pill: 'pill-info' },
  { value: 'appointment', label: 'Cita', pill: 'pill-warn' },
  { value: 'won', label: 'Vendido', pill: 'pill-ok' },
  { value: 'lost', label: 'Perdido', pill: 'pill-mut' },
];

const stageMeta = (s: LeadStage) => STAGES.find((x) => x.value === s) ?? STAGES[0];

/** Bilingual quick replies — the answers a Miami lot sends twenty times a day. */
const QUICK = {
  es: [
    { label: 'Sigue disponible', text: '¡Hola! Sí, todavía está disponible. ¿Te gustaría venir a verlo?' },
    { label: 'Financiamiento', text: 'Trabajamos con financiamiento y aceptamos bajo down payment. ¿Quieres que te haga una cotización?' },
    { label: 'Horario', text: 'Estamos abiertos de lunes a sábado, 9am a 7pm. ¡Pásate cuando quieras!' },
    { label: 'Trade-in', text: 'Sí, aceptamos tu carro como parte de pago. Tráelo y te lo evaluamos gratis.' },
  ],
  en: [
    { label: 'Still available', text: 'Hi! Yes, it is still available. Would you like to come see it?' },
    { label: 'Financing', text: 'We work with financing and accept low down payments. Want me to run a quote for you?' },
    { label: 'Hours', text: 'We are open Monday to Saturday, 9am to 7pm. Come by anytime!' },
    { label: 'Trade-in', text: 'Yes, we take trade-ins. Bring it over and we will appraise it for free.' },
  ],
} as const;

export function LeadsInbox({ leads, dealerName }: { leads: LeadCard[]; dealerName: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(leads[0]?.id ?? null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<LeadStage | 'all'>('all');

  const visible = filter === 'all' ? leads : leads.filter((l) => l.stage === filter);
  const selected = leads.find((l) => l.id === selectedId) ?? visible[0] ?? null;

  async function send() {
    if (!selected || reply.trim() === '') return;
    setBusy(true);
    await fetch(`/api/leads/${selected.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reply }),
    });
    setBusy(false);
    setReply('');
    startTransition(() => router.refresh());
  }

  async function setStage(stage: LeadStage) {
    if (!selected) return;
    setBusy(true);
    await fetch(`/api/leads/${selected.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    setBusy(false);
    startTransition(() => router.refresh());
  }

  if (leads.length === 0) {
    return (
      <div className="card empty">
        <h3>Sin clientes todavía</h3>
        <p className="small">
          Cuando alguien escriba por Messenger, Instagram o WhatsApp a {dealerName}, la conversación
          aparece aquí con el auto que le interesa.
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card card-tight row">
        <button className="btn btn-sm" data-active={filter === 'all'} onClick={() => setFilter('all')}
          style={filter === 'all' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}>
          Todos ({leads.length})
        </button>
        {STAGES.map((s) => {
          const count = leads.filter((l) => l.stage === s.value).length;
          if (count === 0) return null;
          return (
            <button
              key={s.value}
              className="btn btn-sm"
              onClick={() => setFilter(s.value)}
              style={filter === s.value ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
            >
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 300px) minmax(0, 1fr)' }}>
        <div className="stack-sm">
          {visible.map((l) => (
            <button
              key={l.id}
              onClick={() => setSelectedId(l.id)}
              className="card card-tight"
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: selected?.id === l.id ? 'var(--accent)' : undefined,
                background: selected?.id === l.id ? 'var(--accent-soft)' : undefined,
                fontFamily: 'inherit',
              }}
            >
              <div className="spread" style={{ marginBottom: 3 }}>
                <strong style={{ fontSize: 14 }}>{l.name}</strong>
                <span className={`pill ${stageMeta(l.stage).pill}`}>{stageMeta(l.stage).label}</span>
              </div>
              <div className="tiny muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.messages[l.messages.length - 1]?.text}
              </div>
              <div className="tiny muted" style={{ marginTop: 4 }}>
                {CHANNEL_LABEL[l.channel]} · {l.vehicleName ?? 'sin auto asignado'}
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="card">
            <div className="spread" style={{ marginBottom: 14, alignItems: 'flex-start' }}>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                {selected.vehiclePhoto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.vehiclePhoto} alt="" className="thumb" />
                )}
                <div>
                  <h3>{selected.name}</h3>
                  <div className="tiny muted">
                    {CHANNEL_LABEL[selected.channel]} · {selected.handle}
                    {selected.vehicleName ? ` · ${selected.vehicleName}` : ''}
                  </div>
                </div>
              </div>
              <select
                value={selected.stage}
                disabled={busy}
                onChange={(e) => setStage(e.target.value as LeadStage)}
                style={{ width: 'auto' }}
              >
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="chat" style={{ marginBottom: 16 }}>
              {selected.messages.map((m, i) => (
                <div key={i} className={`msg ${m.from === 'lead' ? 'msg-lead' : 'msg-dealer'}`}>
                  {m.text}
                  <div className="msg-at">{relativeTime(m.at)}</div>
                </div>
              ))}
            </div>

            <div className="stack-sm">
              <div className="row" style={{ gap: 6 }}>
                <span className="label" style={{ marginRight: 4 }}>
                  Respuestas rápidas · {selected.lang === 'es' ? 'ES' : 'EN'}
                </span>
                {QUICK[selected.lang].map((q) => (
                  <button key={q.label} className="btn btn-sm btn-ghost" onClick={() => setReply(q.text)}>
                    {q.label}
                  </button>
                ))}
              </div>
              <textarea
                value={reply}
                placeholder={selected.lang === 'es' ? 'Escribe tu respuesta…' : 'Type your reply…'}
                onChange={(e) => setReply(e.target.value)}
                style={{ minHeight: 80 }}
              />
              <div className="row">
                <button className="btn btn-primary" onClick={send} disabled={busy || reply.trim() === ''}>
                  {busy ? 'Enviando…' : 'Enviar respuesta'}
                </button>
                <span className="tiny muted">
                  En modo demo la respuesta se guarda en la conversación pero no sale a{' '}
                  {CHANNEL_LABEL[selected.channel]}.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

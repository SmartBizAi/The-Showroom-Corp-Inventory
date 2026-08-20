'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

interface DealerOption {
  id: string;
  name: string;
  city: string;
}

interface Props {
  dealers: DealerOption[];
  current: DealerOption;
  pendingToday: number;
  newLeads: number;
}

const LINKS = [
  { href: '/', label: 'Resumen' },
  { href: '/publicar', label: 'Publicar hoy', badge: 'queue' },
  { href: '/inventario', label: 'Inventario' },
  { href: '/clientes', label: 'Clientes', badge: 'leads' },
  { href: '/conexiones', label: 'Conexiones' },
  { href: '/ajustes', label: 'Ajustes' },
] as const;

export function Sidebar({ dealers, current, pendingToday, newLeads }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [switching, startSwitch] = useTransition();

  function switchDealer(id: string) {
    startSwitch(async () => {
      await fetch('/api/dealers/switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dealerId: id }),
      });
      router.refresh();
    });
  }

  const initials = current.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <aside className="side">
      <div className="brand">
        <div className="brand-mark">{initials}</div>
        <div>
          <div className="brand-name">Showroom Hub</div>
          <div className="brand-sub">Marketing para dealers</div>
        </div>
      </div>

      <div className="switcher">
        <label htmlFor="dealer-select">Dealer activo</label>
        <select
          id="dealer-select"
          value={current.id}
          disabled={switching}
          onChange={(e) => switchDealer(e.target.value)}
        >
          {dealers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <div className="meta">
          {switching ? 'Cambiando…' : `${current.city} · ${dealers.length} workspace${dealers.length === 1 ? '' : 's'}`}
        </div>
      </div>

      <nav className="nav">
        {LINKS.map((l) => {
          const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
          const badge =
            'badge' in l && l.badge === 'queue' ? pendingToday
            : 'badge' in l && l.badge === 'leads' ? newLeads
            : 0;
          return (
            <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined}>
              <span>{l.label}</span>
              {badge > 0 && <span className="count">{badge}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="side-foot">
        Demo local · los datos viven en <code>data/db.json</code>
      </div>
    </aside>
  );
}

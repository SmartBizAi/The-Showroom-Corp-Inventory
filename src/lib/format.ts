import type { Vehicle } from './types';

export const money = (n: number): string =>
  `$${Math.round(n).toLocaleString('en-US')}`;

export const miles = (n: number): string => `${n.toLocaleString('en-US')} mi`;

export const vehicleName = (v: Vehicle): string =>
  `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ''}`;

export const daysOnLot = (v: Vehicle): number =>
  Math.max(0, Math.floor((Date.now() - Date.parse(v.createdAt)) / 86_400_000));

export const STATUS_LABEL: Record<Vehicle['status'], string> = {
  available: 'Disponible',
  reserved: 'Apartado',
  sold: 'Vendido',
  shop: 'En mecánica',
};

export const STATUS_PILL: Record<Vehicle['status'], string> = {
  available: 'pill-ok',
  reserved: 'pill-warn',
  sold: 'pill-mut',
  shop: 'pill-info',
};

export const TITLE_LABEL: Record<Vehicle['titleType'], string> = {
  clean: 'Título limpio',
  rebuilt: 'Título rebuilt',
  salvage: 'Título salvage',
};

export function relativeTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

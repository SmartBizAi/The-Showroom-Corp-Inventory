// Core domain types. Everything is scoped to a dealer (multi-tenant by design):
// swapping the demo over to a real client is creating a dealer and connecting
// their accounts — no code changes.

export type Platform =
  | 'facebook_page'
  | 'instagram'
  | 'marketplace'
  | 'cargurus'
  | 'offerup'
  | 'whatsapp';

/** How a platform is reached. Drives what the publish engine is allowed to do. */
export type Lane = 'official' | 'feed' | 'assisted';

export interface PlatformMeta {
  id: Platform;
  label: string;
  lane: Lane;
  /** Short explanation shown in the UI so the dealer understands the difference. */
  note: string;
  accountHint: string;
}

export const PLATFORMS: PlatformMeta[] = [
  {
    id: 'facebook_page',
    label: 'Facebook Page',
    lane: 'official',
    note: 'API oficial de Meta. Publica solo, sin que nadie toque nada.',
    accountHint: 'Nombre de la página, ej. The Showroom Corp',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    lane: 'official',
    note: 'API oficial de Meta. Publica solo, todos los días.',
    accountHint: 'Usuario, ej. @theshowroomcorp',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp Business',
    lane: 'official',
    note: 'Cloud API oficial. Recibe y contesta mensajes de clientes.',
    accountHint: 'Número, ej. +1 305 555 0142',
  },
  {
    id: 'cargurus',
    label: 'CarGurus',
    lane: 'feed',
    note: 'Feed de inventario nocturno. Se configura una vez con tu account manager.',
    accountHint: 'Dealer ID de CarGurus',
  },
  {
    id: 'offerup',
    label: 'OfferUp',
    lane: 'feed',
    note: 'Verified Dealer Program. Feed de inventario diario.',
    accountHint: 'Dealer ID de OfferUp',
  },
  {
    id: 'marketplace',
    label: 'Facebook Marketplace',
    lane: 'assisted',
    note: 'Sin API oficial. La app prepara el anuncio y el vendedor pulsa Publicar (1 click por auto).',
    accountHint: 'Cuenta personal del vendedor, ej. Darian P.',
  },
];

export const platformMeta = (id: Platform): PlatformMeta =>
  PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];

export type VehicleStatus = 'available' | 'reserved' | 'sold' | 'shop';
export type TitleType = 'clean' | 'rebuilt' | 'salvage';

export interface Vehicle {
  id: string;
  dealerId: string;
  vin: string | null;
  stockNumber: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  price: number;
  cost: number | null;
  titleType: TitleType;
  transmission: string | null;
  fuel: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  features: string[];
  status: VehicleStatus;
  photos: string[];
  notes: string | null;
  createdAt: string;
}

export interface Caption {
  id: string;
  vehicleId: string;
  platform: Platform;
  lang: 'es' | 'en';
  text: string;
  source: 'ai' | 'template' | 'manual';
  createdAt: string;
}

export type QueueStatus = 'pending' | 'published' | 'skipped';

export interface QueueItem {
  id: string;
  dealerId: string;
  vehicleId: string;
  platform: Platform;
  /** Seller account this listing is assigned to. Null for dealer-level channels. */
  sellerAccountId: string | null;
  scheduledFor: string; // YYYY-MM-DD
  status: QueueStatus;
  publishedAt: string | null;
  listingUrl: string | null;
  createdAt: string;
}

export type LeadStage = 'new' | 'contacted' | 'appointment' | 'won' | 'lost';

export interface Lead {
  id: string;
  dealerId: string;
  name: string;
  channel: 'messenger' | 'instagram' | 'whatsapp';
  handle: string;
  vehicleId: string | null;
  stage: LeadStage;
  lang: 'es' | 'en';
  messages: { from: 'lead' | 'dealer'; text: string; at: string }[];
  createdAt: string;
}

export interface Connection {
  platform: Platform;
  connected: boolean;
  accountName: string | null;
  /** Set when real API credentials are configured; demo mode otherwise. */
  live: boolean;
  connectedAt: string | null;
}

export interface SellerAccount {
  id: string;
  dealerId: string;
  name: string;
  /** Daily Marketplace cap for this account. Conservative by default. */
  dailyLimit: number;
  /** Older accounts tolerate a higher cadence. */
  seasoned: boolean;
}

/**
 * Effective daily Marketplace cap: seasoned accounts tolerate more, new ones
 * stay low. Lives here (dependency-free) so the settings UI can show the number
 * without pulling the server-only queue module into the browser bundle.
 */
export function dailyCap(seasoned: boolean, configured: number): number {
  return Math.min(configured, seasoned ? 8 : 3);
}

export interface Dealer {
  id: string;
  name: string;
  city: string;
  phone: string;
  accent: string;
  /** Caption voice knobs — what makes the copy sound like this dealer. */
  tone: string;
  financing: boolean;
  connections: Connection[];
  createdAt: string;
}

export interface Database {
  dealers: Dealer[];
  sellerAccounts: SellerAccount[];
  vehicles: Vehicle[];
  captions: Caption[];
  queue: QueueItem[];
  leads: Lead[];
}

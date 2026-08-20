// Demo seed. Realistic small-lot Miami inventory so the app looks alive the
// moment it opens — the demo dealer is meant to be replaced by a real client
// workspace from Ajustes → Nuevo dealer.

import type { Database, Dealer, Lead, SellerAccount, Vehicle } from './types';
import { PLATFORMS } from './types';

/** Offline photo placeholder: a car-shaped SVG tinted per vehicle. */
export function placeholderPhoto(label: string, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="hsl(${hue} 32% 88%)"/><stop offset="1" stop-color="hsl(${hue} 28% 72%)"/>
</linearGradient></defs>
<rect width="640" height="420" fill="url(#g)"/>
<g fill="hsl(${hue} 30% 40%)" opacity="0.85">
<path d="M112 268c0-14 8-26 20-32l38-58c8-12 21-19 35-19h190c14 0 27 7 35 19l38 58c12 6 20 18 20 32v34a10 10 0 0 1-10 10h-38a34 34 0 0 0-68 0H228a34 34 0 0 0-68 0h-38a10 10 0 0 1-10-10z"/>
</g>
<g fill="hsl(${hue} 30% 82%)">
<path d="M196 176c5-8 14-13 24-13h160c10 0 19 5 24 13l26 40H170z"/>
</g>
<circle cx="194" cy="312" r="30" fill="hsl(${hue} 20% 28%)"/><circle cx="194" cy="312" r="13" fill="hsl(${hue} 20% 62%)"/>
<circle cx="446" cy="312" r="30" fill="hsl(${hue} 20% 28%)"/><circle cx="446" cy="312" r="13" fill="hsl(${hue} 20% 62%)"/>
<text x="320" y="386" font-family="system-ui,sans-serif" font-size="22" font-weight="600" fill="hsl(${hue} 30% 32%)" text-anchor="middle">${label}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const daysAgo = (n: number): string =>
  new Date(Date.now() - n * 86_400_000).toISOString();

interface SeedCar {
  vin: string;
  stock: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  price: number;
  cost: number;
  title: 'clean' | 'rebuilt';
  color: string;
  features: string[];
  hue: number;
  age: number;
}

const CARS: SeedCar[] = [
  { vin: '4T1B11HK5KU123456', stock: 'A1042', year: 2019, make: 'Toyota', model: 'Camry', trim: 'SE', mileage: 68_400, price: 16_900, cost: 13_200, title: 'clean', color: 'Gris plata', features: ['Cámara de reversa', 'CarPlay', 'Bluetooth'], hue: 210, age: 3 },
  { vin: '2HGFC2F59KH512345', stock: 'A1043', year: 2019, make: 'Honda', model: 'Civic', trim: 'LX', mileage: 54_200, price: 17_400, cost: 14_100, title: 'clean', color: 'Blanco', features: ['Cámara de reversa', 'Sensor de punto ciego'], hue: 30, age: 5 },
  { vin: '1N4BL4BV6LC234567', stock: 'A1044', year: 2020, make: 'Nissan', model: 'Altima', trim: 'S', mileage: 47_800, price: 18_200, cost: 14_800, title: 'clean', color: 'Negro', features: ['Apple CarPlay', 'Control crucero'], hue: 265, age: 8 },
  { vin: '1FTEW1EP7JFA34567', stock: 'A1045', year: 2018, make: 'Ford', model: 'F-150', trim: 'XLT', mileage: 89_100, price: 26_500, cost: 21_900, title: 'clean', color: 'Azul', features: ['4x4', 'Cabina doble', 'Enganche de remolque'], hue: 200, age: 12 },
  { vin: 'KMHD84LF5JU456789', stock: 'A1046', year: 2018, make: 'Hyundai', model: 'Elantra', trim: 'SEL', mileage: 72_600, price: 12_800, cost: 9_900, title: 'clean', color: 'Rojo', features: ['Bluetooth', 'Cámara de reversa'], hue: 6, age: 15 },
  { vin: '1C4RJFAG5JC567890', stock: 'A1047', year: 2018, make: 'Jeep', model: 'Grand Cherokee', trim: 'Laredo', mileage: 81_300, price: 21_900, cost: 17_600, title: 'clean', color: 'Blanco perla', features: ['4x4', 'Asientos de piel', 'Techo panorámico'], hue: 145, age: 20 },
  { vin: '3KPF24AD6LE678901', stock: 'A1048', year: 2020, make: 'Kia', model: 'Forte', trim: 'LXS', mileage: 41_500, price: 15_600, cost: 12_400, title: 'clean', color: 'Gris', features: ['CarPlay', 'Android Auto'], hue: 180, age: 26 },
  { vin: '1G1ZD5ST8LF789012', stock: 'A1049', year: 2020, make: 'Chevrolet', model: 'Malibu', trim: 'LT', mileage: 58_900, price: 17_100, cost: 13_700, title: 'rebuilt', color: 'Plata', features: ['Cámara de reversa', 'Bluetooth'], hue: 220, age: 34 },
];

export function buildSeed(): Database {
  const dealerId = 'dlr_showroom';

  const dealer: Dealer = {
    id: dealerId,
    name: 'The Showroom Corp',
    city: 'Miami, FL',
    phone: '+1 (305) 555-0142',
    accent: '#0E7A74',
    tone: 'Cercano y directo, con emojis. Siempre menciona que hablamos español.',
    financing: true,
    connections: PLATFORMS.map((p) => ({
      platform: p.id,
      // Demo starts with the official lanes connected so the dashboard has data;
      // everything is swappable from /conexiones.
      connected: p.lane !== 'feed',
      accountName:
        p.id === 'facebook_page' ? 'The Showroom Corp'
        : p.id === 'instagram' ? '@theshowroomcorp'
        : p.id === 'whatsapp' ? '+1 (305) 555-0142'
        : p.id === 'marketplace' ? 'Cuentas de vendedores'
        : null,
      live: false,
      connectedAt: p.lane !== 'feed' ? daysAgo(30) : null,
    })),
    createdAt: daysAgo(45),
  };

  const sellerAccounts: SellerAccount[] = [
    { id: 'sel_darian', dealerId, name: 'Darian P.', dailyLimit: 5, seasoned: true },
    { id: 'sel_maria', dealerId, name: 'María G.', dailyLimit: 5, seasoned: true },
    { id: 'sel_luis', dealerId, name: 'Luis R.', dailyLimit: 3, seasoned: false },
  ];

  const vehicles: Vehicle[] = CARS.map((c, i) => ({
    id: `veh_${c.stock.toLowerCase()}`,
    dealerId,
    vin: c.vin,
    stockNumber: c.stock,
    year: c.year,
    make: c.make,
    model: c.model,
    trim: c.trim,
    mileage: c.mileage,
    price: c.price,
    cost: c.cost,
    titleType: c.title,
    transmission: 'Automática',
    fuel: 'Gasolina',
    exteriorColor: c.color,
    interiorColor: 'Negro',
    features: c.features,
    status: i === 7 ? 'sold' : i === 6 ? 'reserved' : 'available',
    photos: [
      placeholderPhoto(`${c.year} ${c.make} ${c.model}`, c.hue),
      placeholderPhoto(`${c.make} ${c.model} · interior`, c.hue + 12),
    ],
    notes: null,
    createdAt: daysAgo(c.age),
  }));

  const leads: Lead[] = [
    {
      id: 'led_1', dealerId, name: 'Yamila C.', channel: 'whatsapp', handle: '+1 786 555 0188',
      vehicleId: 'veh_a1042', stage: 'new', lang: 'es',
      messages: [{ from: 'lead', text: '¿Todavía tienen el Camry? ¿Cuánto es el down payment?', at: daysAgo(0) }],
      createdAt: daysAgo(0),
    },
    {
      id: 'led_2', dealerId, name: 'Marcus T.', channel: 'messenger', handle: 'marcus.t',
      vehicleId: 'veh_a1045', stage: 'contacted', lang: 'en',
      messages: [
        { from: 'lead', text: 'Is the F-150 still available? Any accidents?', at: daysAgo(1) },
        { from: 'dealer', text: 'Yes it is! Clean title, no accidents. Want to come see it?', at: daysAgo(1) },
      ],
      createdAt: daysAgo(1),
    },
    {
      id: 'led_3', dealerId, name: 'Rosa M.', channel: 'instagram', handle: '@rosam_305',
      vehicleId: 'veh_a1046', stage: 'appointment', lang: 'es',
      messages: [
        { from: 'lead', text: 'Me interesa el Elantra rojo 🚗', at: daysAgo(2) },
        { from: 'dealer', text: '¡Perfecto! ¿Te viene bien el sábado a las 11am?', at: daysAgo(2) },
        { from: 'lead', text: 'Sí, ahí estaré', at: daysAgo(2) },
      ],
      createdAt: daysAgo(2),
    },
    {
      id: 'led_4', dealerId, name: 'Carlos B.', channel: 'whatsapp', handle: '+1 305 555 0133',
      vehicleId: 'veh_a1044', stage: 'new', lang: 'es',
      messages: [{ from: 'lead', text: 'Buenas, ¿aceptan trade-in por el Altima?', at: daysAgo(0) }],
      createdAt: daysAgo(0),
    },
  ];

  return { dealers: [dealer], sellerAccounts, vehicles, captions: [], queue: [], leads };
}

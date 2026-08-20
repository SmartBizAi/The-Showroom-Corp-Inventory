// Bilingual caption generation. Uses the Claude API when ANTHROPIC_API_KEY is
// set; otherwise falls back to templates so the demo always produces copy.

import Anthropic from '@anthropic-ai/sdk';
import type { Dealer, Platform, Vehicle } from './types';
import { platformMeta } from './types';

export interface CaptionPair {
  es: string;
  en: string;
  source: 'ai' | 'template';
}

const money = (n: number): string => `$${n.toLocaleString('en-US')}`;
const miles = (n: number): string => n.toLocaleString('en-US');

/** Per-platform shape: what "good" looks like on each channel. */
const PLATFORM_BRIEF: Record<Platform, string> = {
  marketplace:
    'Marketplace: corto y directo, 4-6 líneas, bullets con ✅, precio arriba, cierre con llamada a la acción para escribir.',
  facebook_page:
    'Página de Facebook: 3-5 líneas, tono cálido de negocio local, invita a pasar por el lote.',
  instagram:
    'Instagram: 2-3 líneas con gancho + 6-10 hashtags relevantes de autos y Miami al final.',
  cargurus:
    'CarGurus: descripción larga y formal de 4-6 frases, detalles del vehículo y condición, sin emojis.',
  offerup:
    'OfferUp: 3-4 líneas informales, precio y kilometraje muy visibles, cierre invitando a hacer oferta.',
  whatsapp:
    'WhatsApp: mensaje breve de 2-3 líneas para enviar a un cliente interesado, tono personal.',
};

/**
 * Vehicle data is typed once, in whatever language the dealer works in — so the
 * English caption would otherwise read "Automática · Cámara de reversa". This
 * covers the vocabulary a used-car lot actually types; anything unlisted passes
 * through untouched, which is the right answer for "Bluetooth" or "CarPlay".
 */
const GLOSSARY_ES_EN: Record<string, string> = {
  // Transmission and drivetrain
  'automatica': 'Automatic',
  'manual': 'Manual',
  'estandar': 'Manual',
  'triptronic': 'Tiptronic',
  'traccion delantera': 'Front-wheel drive',
  'traccion trasera': 'Rear-wheel drive',
  'traccion integral': 'All-wheel drive',
  // Fuel
  'gasolina': 'Gasoline',
  'diesel': 'Diesel',
  'hibrido': 'Hybrid',
  'electrico': 'Electric',
  // Equipment
  'camara de reversa': 'Backup camera',
  'camara': 'Camera',
  'sensor de punto ciego': 'Blind spot monitor',
  'control crucero': 'Cruise control',
  'asientos de piel': 'Leather seats',
  'asientos de tela': 'Cloth seats',
  'asientos calefaccionados': 'Heated seats',
  'techo solar': 'Sunroof',
  'techo panoramico': 'Panoramic roof',
  'enganche de remolque': 'Tow hitch',
  'cabina doble': 'Crew cab',
  'aire acondicionado': 'Air conditioning',
  'frio que corta': 'Ice cold A/C',
  'llantas nuevas': 'New tires',
  'un solo dueno': 'One owner',
  'sin accidentes': 'No accidents',
  'vidrios electricos': 'Power windows',
  'arranque sin llave': 'Keyless start',
  'pantalla tactil': 'Touchscreen',
  'navegacion': 'Navigation',
  // Colors — often written as compounds ("gris plata", "blanco perla"), which
  // the word-wise pass below handles once each word is known.
  'blanco': 'White',
  'negro': 'Black',
  'gris': 'Gray',
  'plata': 'Silver',
  'plateado': 'Silver',
  'rojo': 'Red',
  'azul': 'Blue',
  'verde': 'Green',
  'amarillo': 'Yellow',
  'naranja': 'Orange',
  'dorado': 'Gold',
  'marron': 'Brown',
  'cafe': 'Brown',
  'beige': 'Beige',
  'vino': 'Burgundy',
  'perla': 'Pearl',
  'metalico': 'Metallic',
  // English reverses the modifier order, so the common compounds get their own
  // entries rather than coming out as "Gray silver".
  'gris plata': 'Silver gray',
  'gris oscuro': 'Dark gray',
  'gris claro': 'Light gray',
  'blanco perla': 'Pearl white',
  'negro metalico': 'Metallic black',
  'azul marino': 'Navy blue',
  'rojo vino': 'Burgundy',
};

/** Lowercase and strip accents so "Cámara" and "camara" hit the same entry. */
const glossaryKey = (s: string): string =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function toEnglish(term: string | null): string | null {
  if (term === null) return null;

  const whole = GLOSSARY_ES_EN[glossaryKey(term)];
  if (whole) return whole;

  // Compounds like "gris plata" have no entry of their own; translate the parts
  // and keep the phrase only if at least one word was actually recognized.
  const words = term.trim().split(/\s+/);
  if (words.length < 2) return term;

  let hit = false;
  const mapped = words.map((w, i) => {
    const found = GLOSSARY_ES_EN[glossaryKey(w)];
    if (!found) return w;
    hit = true;
    return i === 0 ? found : found.toLowerCase();
  });
  return hit ? mapped.join(' ') : term;
}

/** Picks the caller's language for a value stored in the dealer's own words. */
const localize = (term: string | null, lang: 'es' | 'en'): string | null =>
  lang === 'en' ? toEnglish(term) : term;

function templateCaption(v: Vehicle, d: Dealer, platform: Platform, lang: 'es' | 'en'): string {
  const name = `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ''}`;
  const titleEs = v.titleType === 'clean' ? 'Título limpio' : v.titleType === 'rebuilt' ? 'Título rebuilt' : 'Título salvage';
  const titleEn = v.titleType === 'clean' ? 'Clean title' : v.titleType === 'rebuilt' ? 'Rebuilt title' : 'Salvage title';
  // Vehicle-supplied values carry the dealer's own wording — localize them so an
  // English caption never ships half in Spanish.
  const feats = v.features.slice(0, 3).map((f) => localize(f, lang) ?? f);
  const transmission = localize(v.transmission, lang);
  const fuel = localize(v.fuel, lang);
  const color = localize(v.exteriorColor, lang);

  if (platform === 'instagram') {
    const tags = `#Miami #CarrosEnMiami #${v.make} #${v.make}${v.model.replace(/\s/g, '')} #AutosUsados #MiamiCars #CarrosBaratos #Doral #Hialeah #UsedCars`;
    return lang === 'es'
      ? `🚗 ${name} — ${money(v.price)}\n${miles(v.mileage)} millas · ${titleEs}${d.financing ? ' · Financiamiento disponible' : ''}\n📍 ${d.city} — escríbenos por DM\n\n${tags}`
      : `🚗 ${name} — ${money(v.price)}\n${miles(v.mileage)} miles · ${titleEn}${d.financing ? ' · Financing available' : ''}\n📍 ${d.city} — DM us\n\n${tags}`;
  }

  if (platform === 'cargurus') {
    return lang === 'es'
      ? `${name} con ${miles(v.mileage)} millas. ${titleEs}. ${transmission ?? 'Automática'}, ${fuel ?? 'gasolina'}, exterior ${color ?? 'a consultar'}. Equipamiento: ${feats.join(', ') || 'consultar'}. Vehículo inspeccionado y listo para entrega en ${d.city}.${d.financing ? ' Ofrecemos opciones de financiamiento.' : ''} Contáctenos al ${d.phone}.`
      : `${name} with ${miles(v.mileage)} miles. ${titleEn}. ${transmission ?? 'Automatic'}, ${fuel ?? 'gasoline'}, ${color ?? 'color on request'} exterior. Equipment: ${feats.join(', ') || 'ask us'}. Inspected and ready for delivery in ${d.city}.${d.financing ? ' Financing options available.' : ''} Call us at ${d.phone}.`;
  }

  if (platform === 'whatsapp') {
    return lang === 'es'
      ? `¡Hola! Te comparto el ${name} — ${money(v.price)}, ${miles(v.mileage)} millas, ${titleEs.toLowerCase()}.${d.financing ? ' Tenemos financiamiento con bajo down payment.' : ''} ¿Te gustaría verlo esta semana?`
      : `Hi! Sharing the ${name} — ${money(v.price)}, ${miles(v.mileage)} miles, ${titleEn.toLowerCase()}.${d.financing ? ' We have financing with low down payment.' : ''} Would you like to see it this week?`;
  }

  const bulletsEs = [
    `${miles(v.mileage)} millas · ${titleEs}`,
    `${transmission ?? 'Automática'}${feats[0] ? ` · ${feats[0]}` : ''}`,
    ...(feats[1] ? [feats.slice(1).join(' · ')] : []),
  ];
  const bulletsEn = [
    `${miles(v.mileage)} miles · ${titleEn}`,
    `${transmission ?? 'Automatic'}${feats[0] ? ` · ${feats[0]}` : ''}`,
    ...(feats[1] ? [feats.slice(1).join(' · ')] : []),
  ];

  return lang === 'es'
    ? `🚗 ${name} — ${money(v.price)}\n${bulletsEs.map((b) => `✅ ${b}`).join('\n')}\n📍 ${d.city}${d.financing ? ' — Financiamiento disponible, bajo down payment' : ''}\n📲 Escríbenos hoy — hablamos español · ${d.phone}`
    : `🚗 ${name} — ${money(v.price)}\n${bulletsEn.map((b) => `✅ ${b}`).join('\n')}\n📍 ${d.city}${d.financing ? ' — Financing available, low down payment' : ''}\n📲 Message us today — se habla español · ${d.phone}`;
}

export function templatePair(v: Vehicle, d: Dealer, platform: Platform): CaptionPair {
  return {
    es: templateCaption(v, d, platform, 'es'),
    en: templateCaption(v, d, platform, 'en'),
    source: 'template',
  };
}

/** Pulls the first balanced JSON object out of a model response. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('sin JSON en la respuesta');
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function generatePair(
  v: Vehicle,
  d: Dealer,
  platform: Platform,
): Promise<CaptionPair> {
  if (!process.env.ANTHROPIC_API_KEY) return templatePair(v, d, platform);

  const client = new Anthropic();

  const system = [
    'Eres el redactor de marketing de un dealer de autos usados en Miami.',
    'Escribes anuncios que suenan a persona real, no a plantilla corporativa.',
    'Devuelves SIEMPRE y ÚNICAMENTE un objeto JSON con las claves "es" y "en".',
    'Nunca inventes datos del vehículo: usa solo los que te doy.',
    'No prometas garantías, aprobaciones de crédito ni precios distintos al indicado.',
  ].join(' ');

  const spec = {
    vehiculo: {
      titulo: `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ''}`,
      precio: money(v.price),
      millas: miles(v.mileage),
      titulo_legal: v.titleType,
      transmision: v.transmission,
      combustible: v.fuel,
      color_exterior: v.exteriorColor,
      equipamiento: v.features,
    },
    dealer: {
      nombre: d.name,
      ciudad: d.city,
      telefono: d.phone,
      financiamiento: d.financing,
      tono: d.tone,
    },
    canal: platformMeta(platform).label,
    formato: PLATFORM_BRIEF[platform],
  };

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 2000,
    system,
    messages: [
      {
        role: 'user',
        content:
          `Escribe el anuncio para este vehículo en español ("es") e inglés ("en").\n` +
          `${JSON.stringify(spec, null, 2)}\n\n` +
          `Responde solo el JSON: {"es": "...", "en": "..."}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  const parsed = extractJson(text) as { es?: unknown; en?: unknown };
  if (typeof parsed.es !== 'string' || typeof parsed.en !== 'string') {
    throw new Error('el modelo no devolvió ambos idiomas');
  }
  return { es: parsed.es, en: parsed.en, source: 'ai' };
}

/** Never throws: AI when possible, templates when not. */
export async function generatePairSafe(
  v: Vehicle,
  d: Dealer,
  platform: Platform,
): Promise<CaptionPair & { warning?: string }> {
  try {
    return await generatePair(v, d, platform);
  } catch (error) {
    const warning =
      error instanceof Anthropic.AuthenticationError
        ? 'La API key de Claude no es válida — se usó la plantilla.'
        : error instanceof Anthropic.RateLimitError
          ? 'Límite de la API alcanzado — se usó la plantilla.'
          : `No se pudo generar con IA (${error instanceof Error ? error.message : 'error desconocido'}) — se usó la plantilla.`;
    return { ...templatePair(v, d, platform), warning };
  }
}

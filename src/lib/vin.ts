// VIN decoding via NHTSA vPIC — a real, free, key-less US government API.
// This works in the demo exactly as it will in production.

export interface DecodedVin {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  transmission: string | null;
  fuel: string | null;
  bodyClass: string | null;
}

// Overridable so the decoder can be pointed at a mirror or a local mock; the
// default is the live government endpoint.
const ENDPOINT =
  process.env.NHTSA_BASE_URL ?? 'https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues';

interface VpicRow {
  ModelYear?: string;
  Make?: string;
  Model?: string;
  Trim?: string;
  Series?: string;
  TransmissionStyle?: string;
  FuelTypePrimary?: string;
  BodyClass?: string;
}

const clean = (v: string | undefined): string | null => {
  const t = (v ?? '').trim();
  return t === '' || t.toLowerCase() === 'not applicable' ? null : t;
};

const titleCase = (v: string | null): string | null =>
  v === null ? null : v.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

export function isValidVin(vin: string): boolean {
  // 17 chars, no I/O/Q — enough to catch typos before hitting the network.
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin.trim());
}

export async function decodeVin(vin: string): Promise<DecodedVin> {
  const res = await fetch(`${ENDPOINT}/${encodeURIComponent(vin.trim())}?format=json`, {
    headers: { accept: 'application/json' },
    // vPIC data is static per VIN — cache it.
    next: { revalidate: 86_400 },
  });
  if (!res.ok) throw new Error(`NHTSA respondió ${res.status}`);

  const body = (await res.json()) as { Results?: VpicRow[] };
  const row = body.Results?.[0];
  if (!row) throw new Error('NHTSA no devolvió resultados para ese VIN');

  const yearRaw = clean(row.ModelYear);
  return {
    year: yearRaw === null ? null : Number.parseInt(yearRaw, 10) || null,
    make: titleCase(clean(row.Make)),
    model: titleCase(clean(row.Model)),
    trim: clean(row.Trim) ?? clean(row.Series),
    transmission: clean(row.TransmissionStyle),
    fuel: titleCase(clean(row.FuelTypePrimary)),
    bodyClass: clean(row.BodyClass),
  };
}

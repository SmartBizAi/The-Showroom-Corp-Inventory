import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { mutate, newId } from '@/lib/store';
import { currentDealerId } from '@/lib/session';
import { placeholderPhoto } from '@/lib/seed';
import type { TitleType, Vehicle } from '@/lib/types';

export const runtime = 'nodejs';

/** Accepted header spellings per field — dealers name columns however they like. */
const COLUMNS: Record<string, string[]> = {
  vin: ['vin', 'vin#', 'numero de vin', 'número de vin'],
  stockNumber: ['stock', 'stock#', 'stock number', 'stocknumber', 'numero de stock'],
  year: ['year', 'año', 'ano', 'anio', 'modelo año'],
  make: ['make', 'marca'],
  model: ['model', 'modelo'],
  trim: ['trim', 'version', 'versión'],
  mileage: ['mileage', 'miles', 'millas', 'kilometraje', 'odometer'],
  price: ['price', 'precio', 'asking price', 'sale price'],
  cost: ['cost', 'costo', 'coste'],
  titleType: ['title', 'titulo', 'título', 'title type'],
  transmission: ['transmission', 'transmision', 'transmisión'],
  fuel: ['fuel', 'combustible', 'fuel type'],
  exteriorColor: ['color', 'exterior color', 'color exterior'],
  interiorColor: ['interior', 'interior color', 'color interior'],
  features: ['features', 'equipamiento', 'equipo', 'notes', 'notas', 'extras'],
};

// Header matching has to survive real dealer spreadsheets: "Stock #", "STOCK_NO",
// "Precio ($)". Strip punctuation and collapse whitespace before comparing.
const norm = (s: string): string =>
  s
    .toString()
    .toLowerCase()
    .replace(/[_\-.#()$:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function buildHeaderMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((raw, i) => {
    const h = norm(raw);
    for (const [field, aliases] of Object.entries(COLUMNS)) {
      if (map[field] === undefined && aliases.includes(h)) map[field] = i;
    }
  });
  return map;
}

const cellStr = (row: unknown[], idx: number | undefined): string =>
  idx === undefined || row[idx] === undefined || row[idx] === null ? '' : String(row[idx]).trim();

function cellNum(row: unknown[], idx: number | undefined): number | null {
  const raw = cellStr(row, idx);
  if (raw === '') return null;
  const n = Number.parseFloat(raw.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseTitle(raw: string): TitleType {
  const v = raw.toLowerCase();
  if (v.includes('rebuil') || v.includes('reconstru')) return 'rebuilt';
  if (v.includes('salvage') || v.includes('chatarr')) return 'salvage';
  return 'clean';
}

export interface ImportReport {
  created: number;
  updated: number;
  errors: { row: number; reason: string }[];
  unmatchedHeaders: string[];
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
  }

  const dealerId = await currentDealerId();

  let rows: unknown[][];
  let headers: string[];
  try {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new Error('el archivo no tiene hojas');
    const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
    if (raw.length < 2) throw new Error('se necesita una fila de encabezados y al menos un vehículo');
    headers = (raw[0] as unknown[]).map((h) => String(h ?? ''));
    rows = raw.slice(1);
  } catch (error) {
    return NextResponse.json(
      { error: `No se pudo leer el archivo: ${error instanceof Error ? error.message : 'formato no reconocido'}` },
      { status: 400 },
    );
  }

  const map = buildHeaderMap(headers);
  const matched = new Set(Object.values(map));
  const unmatchedHeaders = headers.filter((h, i) => h.trim() !== '' && !matched.has(i));

  if (map.make === undefined || map.model === undefined) {
    return NextResponse.json(
      {
        error:
          'El archivo necesita al menos columnas de marca y modelo (Make/Marca, Model/Modelo). ' +
          `Encabezados encontrados: ${headers.filter((h) => h.trim() !== '').join(', ')}`,
      },
      { status: 400 },
    );
  }

  const report: ImportReport = { created: 0, updated: 0, errors: [], unmatchedHeaders };

  mutate((db) => {
    rows.forEach((row, i) => {
      const rowNo = i + 2; // 1-indexed + header row
      // Skip only genuinely blank filler rows. A row carrying any data but
      // missing the make or model is a real problem the dealer must see.
      const hasAnyData = Object.values(map).some((idx) => cellStr(row, idx) !== '');
      if (!hasAnyData) return;

      const make = cellStr(row, map.make);
      const model = cellStr(row, map.model);
      if (make === '' || model === '') {
        report.errors.push({ row: rowNo, reason: 'falta la marca o el modelo' });
        return;
      }

      const year = cellNum(row, map.year);
      if (year === null || year < 1900 || year > 2100) {
        report.errors.push({ row: rowNo, reason: `año inválido ("${cellStr(row, map.year)}")` });
        return;
      }

      const price = cellNum(row, map.price);
      if (price === null) {
        report.errors.push({ row: rowNo, reason: 'falta el precio o no es un número' });
        return;
      }

      const vin = cellStr(row, map.vin) || null;
      const stock = cellStr(row, map.stockNumber) || null;
      const featuresRaw = cellStr(row, map.features);
      const hue = Math.abs([...`${make}${model}`].reduce((a, c) => a + c.charCodeAt(0), 0)) % 360;

      const fields = {
        vin,
        stockNumber: stock,
        year,
        make,
        model,
        trim: cellStr(row, map.trim) || null,
        mileage: cellNum(row, map.mileage) ?? 0,
        price,
        cost: cellNum(row, map.cost),
        titleType: parseTitle(cellStr(row, map.titleType)),
        transmission: cellStr(row, map.transmission) || null,
        fuel: cellStr(row, map.fuel) || null,
        exteriorColor: cellStr(row, map.exteriorColor) || null,
        interiorColor: cellStr(row, map.interiorColor) || null,
        features: featuresRaw === '' ? [] : featuresRaw.split(/[;,|]/).map((f) => f.trim()).filter(Boolean),
      };

      // Upsert on VIN, else stock number — re-importing the same sheet updates
      // prices instead of duplicating the lot.
      const existing = db.vehicles.find(
        (v) =>
          v.dealerId === dealerId &&
          ((vin !== null && v.vin === vin) || (vin === null && stock !== null && v.stockNumber === stock)),
      );

      if (existing) {
        Object.assign(existing, fields);
        report.updated += 1;
        return;
      }

      const created: Vehicle = {
        id: newId('veh'),
        dealerId,
        ...fields,
        status: 'available',
        photos: [placeholderPhoto(`${year} ${make} ${model}`, hue)],
        notes: null,
        createdAt: new Date().toISOString(),
      };
      db.vehicles.push(created);
      report.created += 1;
    });
  });

  return NextResponse.json({ ok: true, report });
}

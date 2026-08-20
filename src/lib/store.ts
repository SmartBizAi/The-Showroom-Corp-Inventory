// JSON-file data layer. Deliberately isolated behind this module: the Supabase
// swap (see PLAN.md §4) replaces this file and nothing else. The demo runs with
// zero external services so it can be shown on any laptop.

import fs from 'node:fs';
import path from 'node:path';
import type { Database } from './types';
import { buildSeed } from './seed';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

const empty: Database = {
  dealers: [],
  sellerAccounts: [],
  vehicles: [],
  captions: [],
  queue: [],
  leads: [],
};

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(buildSeed(), null, 2), 'utf8');
  }
}

export function readDb(): Database {
  ensureFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) as Partial<Database>;
    return { ...empty, ...parsed };
  } catch {
    // A corrupt file should not brick the demo — rebuild from seed.
    const fresh = buildSeed();
    fs.writeFileSync(DB_PATH, JSON.stringify(fresh, null, 2), 'utf8');
    return fresh;
  }
}

export function writeDb(db: Database): void {
  ensureFile();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

/** Read-modify-write helper so callers never forget to persist. */
export function mutate<T>(fn: (db: Database) => T): T {
  const db = readDb();
  const result = fn(db);
  writeDb(db);
  return result;
}

export function resetDb(): Database {
  const fresh = buildSeed();
  writeDb(fresh);
  return fresh;
}

export const newId = (prefix: string): string =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export const today = (): string => new Date().toISOString().slice(0, 10);

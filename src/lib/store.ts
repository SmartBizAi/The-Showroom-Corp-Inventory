// Data layer for the demo. Deliberately isolated behind this module: the
// Supabase swap (see PLAN.md §4) replaces this file and nothing else.
//
// Storage has to survive two very different homes:
//   * a laptop, where ./data/db.json persists across restarts;
//   * a serverless host (Vercel), where the bundle is read-only and only the
//     OS temp dir is writable — and even that vanishes when the instance is
//     recycled.
// So every filesystem call is best-effort and an in-process copy is the real
// source of truth for the lifetime of the instance. Nothing here throws: a
// read-only disk degrades to memory instead of taking the whole app down.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Database } from './types';
import { buildSeed } from './seed';

export type StorageMode = 'persistent' | 'ephemeral';

const isServerless = Boolean(
  process.env.VERCEL ?? process.env.AWS_LAMBDA_FUNCTION_NAME ?? process.env.NETLIFY,
);

function dataDir(): string {
  if (process.env.SHOWROOM_DATA_DIR) return process.env.SHOWROOM_DATA_DIR;
  if (isServerless) return path.join(os.tmpdir(), 'showroom-hub');
  return path.join(process.cwd(), 'data');
}

const DB_PATH = (): string => path.join(dataDir(), 'db.json');

/**
 * The instance-local copy. Also what keeps the demo coherent on serverless:
 * within one warm instance, every read sees the previous write even when the
 * disk rejected it.
 */
let cache: Database | null = null;

/** Flips to false the first time the disk refuses a write. */
let diskWritable = true;

function tryPersist(db: Database): void {
  if (!diskWritable) return;
  try {
    fs.mkdirSync(dataDir(), { recursive: true });
    fs.writeFileSync(DB_PATH(), JSON.stringify(db, null, 2), 'utf8');
  } catch {
    // Read-only filesystem (or no space). Memory keeps the demo running; say so
    // once rather than on every request.
    diskWritable = false;
    console.warn(
      '[showroom] Almacenamiento en disco no disponible — la demo corre en memoria y los cambios se pierden al reiniciar la instancia.',
    );
  }
}

function loadFromDisk(): Database | null {
  try {
    const raw = fs.readFileSync(DB_PATH(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<Database>;
    // A file written by an older build may be missing newer collections.
    return {
      dealers: parsed.dealers ?? [],
      sellerAccounts: parsed.sellerAccounts ?? [],
      vehicles: parsed.vehicles ?? [],
      captions: parsed.captions ?? [],
      queue: parsed.queue ?? [],
      leads: parsed.leads ?? [],
    };
  } catch {
    // Missing file on first boot, or corrupt JSON — both mean "start from seed".
    return null;
  }
}

export function readDb(): Database {
  if (cache) return cache;

  const fromDisk = loadFromDisk();
  if (fromDisk && fromDisk.dealers.length > 0) {
    cache = fromDisk;
    return cache;
  }

  cache = buildSeed();
  tryPersist(cache);
  return cache;
}

export function writeDb(db: Database): void {
  cache = db;
  tryPersist(db);
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
  cache = fresh;
  tryPersist(fresh);
  return fresh;
}

/**
 * Whether changes outlive the process. The UI shows this so nobody is
 * surprised when a serverless demo forgets a car after an idle period.
 */
export function storageMode(): StorageMode {
  // Touch the store so `diskWritable` reflects a real attempt, not a guess.
  readDb();
  return diskWritable ? 'persistent' : 'ephemeral';
}

export const newId = (prefix: string): string =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export const today = (): string => new Date().toISOString().slice(0, 10);

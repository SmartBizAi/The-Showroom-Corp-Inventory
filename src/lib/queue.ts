// The publishing engine: decides what gets posted today, on which channel, from
// which account — respecting the per-account caps that keep sellers safe.

import type { Database, Platform, QueueItem, Vehicle } from './types';
import { dailyCap, platformMeta } from './types';
import { newId, today } from './store';

/** Channels that run unattended once connected (lanes: official + feed). */
export const AUTO_PLATFORMS: Platform[] = [
  'facebook_page',
  'instagram',
  'cargurus',
  'offerup',
];

const isListable = (v: Vehicle): boolean =>
  v.status === 'available' || v.status === 'reserved';

/**
 * Ranks what deserves a post today: freshly arrived first, then whatever has
 * gone longest without being posted. Keeps the rotation from replaying the
 * same three cars every morning.
 */
function rank(db: Database, dealerId: string, platform: Platform): Vehicle[] {
  const lastPost = new Map<string, number>();
  for (const item of db.queue) {
    if (item.platform !== platform || item.status !== 'published') continue;
    const at = item.publishedAt ? Date.parse(item.publishedAt) : 0;
    lastPost.set(item.vehicleId, Math.max(lastPost.get(item.vehicleId) ?? 0, at));
  }

  return db.vehicles
    .filter((v) => v.dealerId === dealerId && isListable(v))
    .map((v) => ({
      v,
      never: lastPost.has(v.id) ? 1 : 0,
      last: lastPost.get(v.id) ?? 0,
      added: Date.parse(v.createdAt),
    }))
    .sort((a, b) => a.never - b.never || a.last - b.last || b.added - a.added)
    .map((r) => r.v);
}

export interface BuildResult {
  created: QueueItem[];
  /** Channels skipped because the dealer has not connected them yet. */
  skippedPlatforms: string[];
}

/**
 * Builds today's queue for a dealer. Idempotent: calling it twice in one day
 * tops up to the caps instead of duplicating work.
 */
export function buildTodayQueue(db: Database, dealerId: string): BuildResult {
  const dealer = db.dealers.find((d) => d.id === dealerId);
  if (!dealer) return { created: [], skippedPlatforms: [] };

  const day = today();
  const created: QueueItem[] = [];
  const skippedPlatforms: string[] = [];
  const existingToday = db.queue.filter(
    (q) => q.dealerId === dealerId && q.scheduledFor === day,
  );

  const alreadyQueued = (vehicleId: string, platform: Platform): boolean =>
    existingToday.some((q) => q.vehicleId === vehicleId && q.platform === platform) ||
    created.some((q) => q.vehicleId === vehicleId && q.platform === platform);

  // --- Unattended channels: one post per connected channel per day.
  for (const platform of AUTO_PLATFORMS) {
    const conn = dealer.connections.find((c) => c.platform === platform);
    if (!conn?.connected) {
      skippedPlatforms.push(platformMeta(platform).label);
      continue;
    }
    const already = existingToday.filter((q) => q.platform === platform).length;
    if (already > 0) continue;

    const next = rank(db, dealerId, platform).find((v) => !alreadyQueued(v.id, platform));
    if (!next) continue;

    const item: QueueItem = {
      id: newId('q'),
      dealerId,
      vehicleId: next.id,
      platform,
      sellerAccountId: null,
      scheduledFor: day,
      status: 'pending',
      publishedAt: null,
      listingUrl: null,
      createdAt: new Date().toISOString(),
    };
    created.push(item);
    db.queue.push(item);
  }

  // --- Marketplace: assisted, spread across seller accounts under their caps.
  const mkConn = dealer.connections.find((c) => c.platform === 'marketplace');
  if (mkConn?.connected) {
    const sellers = db.sellerAccounts.filter((s) => s.dealerId === dealerId);
    if (sellers.length === 0) {
      skippedPlatforms.push('Marketplace (sin vendedores registrados)');
    }
    const pool = rank(db, dealerId, 'marketplace');
    let cursor = 0;

    // Round-robin, not seller-by-seller: when the lot is smaller than the
    // combined caps, everyone still gets a share instead of the first two
    // sellers absorbing the whole day's work.
    const remaining = new Map(
      sellers.map((s) => {
        const already = existingToday.filter(
          (q) => q.platform === 'marketplace' && q.sellerAccountId === s.id,
        ).length;
        return [s.id, Math.max(0, dailyCap(s.seasoned, s.dailyLimit) - already)];
      }),
    );

    let assigned = true;
    while (assigned) {
      assigned = false;
      for (const seller of sellers) {
        if ((remaining.get(seller.id) ?? 0) <= 0) continue;

        // One vehicle is never listed from two accounts at once.
        while (cursor < pool.length && alreadyQueued(pool[cursor].id, 'marketplace')) {
          cursor += 1;
        }
        if (cursor >= pool.length) {
          assigned = false;
          break;
        }

        const item: QueueItem = {
          id: newId('q'),
          dealerId,
          vehicleId: pool[cursor].id,
          platform: 'marketplace',
          sellerAccountId: seller.id,
          scheduledFor: day,
          status: 'pending',
          publishedAt: null,
          listingUrl: null,
          createdAt: new Date().toISOString(),
        };
        created.push(item);
        db.queue.push(item);
        cursor += 1;
        remaining.set(seller.id, (remaining.get(seller.id) ?? 1) - 1);
        assigned = true;
      }
    }
  } else {
    skippedPlatforms.push(platformMeta('marketplace').label);
  }

  return { created, skippedPlatforms };
}

/** Removes queue rows for vehicles that are no longer listable (e.g. sold). */
export function pruneQueue(db: Database, dealerId: string): number {
  const listable = new Set(
    db.vehicles.filter((v) => v.dealerId === dealerId && isListable(v)).map((v) => v.id),
  );
  const before = db.queue.length;
  db.queue = db.queue.filter(
    (q) => q.dealerId !== dealerId || q.status !== 'pending' || listable.has(q.vehicleId),
  );
  return before - db.queue.length;
}

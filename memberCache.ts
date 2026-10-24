/* =========================================================
   MEMBER DATA CACHE  (shared by My Account Copy + My Outstanding)

   Lives at module level, so it survives the screen being closed and
   opened again while the app stays open. A page that finds its data
   here shows it straight away and makes NO network request. A pull
   to refresh / refresh button always skips the cache, fetches fresh
   data from the server and stores it here again.

   What is cached is the RAW server reply only (group list, ledger of
   a group, dividends of a group). Penalty, status, days left and all
   totals are still worked out fresh every time a page opens, so
   "overdue" / "days left" never go stale.

   Safety rules built in:
   - Everything is stored against the logged-in user id. If a
     different user id shows up, the old user's data is thrown away
     first, so one member can never see another member's numbers.
   - Entries older than MEMBER_CACHE_MAX_AGE_MS are ignored and
     fetched again. Set it to Infinity if you want data to be
     re-fetched ONLY on manual refresh.
   - clearMemberCache() wipes everything. Call it on logout.
========================================================= */

export const MEMBER_CACHE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

type CacheEntry = { data: any; savedAt: number };

const store = new Map<string, CacheEntry>();
let cacheOwner: string | null = null;

export const clearMemberCache = () => {
  store.clear();
  cacheOwner = null;
};

export const cacheGet = (userId: string, key: string): any | undefined => {
  if (!userId) return undefined;

  if (cacheOwner !== userId) {
    // Different member than the one the cache was filled for.
    clearMemberCache();
    return undefined;
  }

  const entry = store.get(key);
  if (!entry) return undefined;

  if (Date.now() - entry.savedAt > MEMBER_CACHE_MAX_AGE_MS) {
    store.delete(key);
    return undefined;
  }

  return entry.data;
};

export const cacheSet = (userId: string, key: string, data: any) => {
  if (!userId) return;

  if (cacheOwner !== userId) {
    clearMemberCache();
    cacheOwner = userId;
  }

  store.set(key, { data, savedAt: Date.now() });
};

// Keys used by both pages (keep them identical so the pages share data)
export const groupsKey = () => "groups";
export const ledgerKey = (groupId: string, groupMemberId: string) =>
  `ledger:${groupId}:${groupMemberId || ""}`;
export const dividendsKey = (groupId: string, groupMemberId: string) =>
  `dividends:${groupId}:${groupMemberId || ""}`;
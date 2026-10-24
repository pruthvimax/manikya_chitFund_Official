/**
 * Compares the penalty a page calculated with the number the backend
 * calculated (single point of truth). It ONLY logs a warning when they
 * differ - it never changes what the screen shows.
 */
const alreadyLogged = new Set<string>();

export const logPenaltyMismatch = (
  page: string,
  key: string,
  pageValue: number,
  backendValue: any
) => {
  if (backendValue === undefined || backendValue === null) return;

  const a = Number(pageValue || 0);
  const b = Number(backendValue || 0);
  if (a === b) return;

  const id = `${page}|${key}|${a}|${b}`;
  if (alreadyLogged.has(id)) return;
  alreadyLogged.add(id);

  console.warn(
    `PENALTY MISMATCH [${page}] ${key}: page=${a} backend=${b}`
  );
};

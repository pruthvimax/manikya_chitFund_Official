/* tiny shared flag: true while the "Live video auction" cover is open on the Bid Now page.
   The member bottom navigation listens to it, so the navigation shows on that cover. */
let on = false;
const subs = new Set<(v: boolean) => void>();

export const isBidNowCover = () => on;

export const setBidNowCover = (v: boolean) => {
  if (on === v) return;
  on = v;
  subs.forEach((f) => f(v));
};

export const subscribeBidNowCover = (f: (v: boolean) => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};

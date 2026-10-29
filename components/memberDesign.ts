// ONE-LINE SWITCH for the member side design.
//   true  = NEW design (floating bottom navigation + new menu top bar/cards)
//   false = OLD design (exactly how it was before)
// Change it, save, and reload the app. Nothing else needs to change.
export const USE_NEW_MEMBER_DESIGN = true;

// ONE-LINE SWITCH for the ADMIN dashboard (app/admin/index.tsx).
//   true  = NEW look (animated header, hero card, Overview donut, Live Bids, grouped menu)
//   false = the admin page exactly as it was before
export const USE_NEW_ADMIN_DESIGN = true;

// ONE-LINE SWITCH for the EMPLOYEE "Chit Schemes" page (app/employee/chitscheme.tsx).
//   true  = NEW card design (icons, tiles)
//   false = the table exactly as it was before
export const USE_NEW_EMPLOYEE_DESIGN = true;

// ONE-LINE SWITCH for the ADMIN "Chit Schemes" page (app/admin/chitSchemes.tsx).
//   true  = NEW card design (gradient header, stats, search, scheme cards)
//   false = the form + table exactly as it was before
export const USE_NEW_ADMIN_SCHEMES_DESIGN = true;

// ONE-LINE SWITCH for the EMPLOYEE home page (app/employee/index.tsx).
//   true  = NEW home (greeting header, today tiles, follow-up Call card, quick actions, menu tiles)
//   false = the dashboard exactly as it was before
export const USE_NEW_EMPLOYEE_HOME_DESIGN = true;

// Bottom space the floating member navigation needs, so the last card on a page is
// never hidden behind it. Pages use navPad(their old bottom padding).
export const NAV_FLOAT_SPACE = 100;
export const navPad = (n: number = 0) => n + (USE_NEW_MEMBER_DESIGN ? NAV_FLOAT_SPACE : 0);

# Hearth & Ledger — how it was built

## The idea

One tight concept: **every rupiah has a job.** The household's income
is assigned to categories before the month starts, each category has a
monthly budget, spending is tracked against it, and whatever is left is
assigned to savings goals. The "What-if planner" is the twist that
makes the concept pay off: cut one category and the site counts, in
months, how much sooner a goal is reached.

## What the site has

- **Dashboard** — income, spending, saved, and what is left after the
  bills still due; where the money went; bills still due; recent
  activity; month navigation back to June 2026.
- **Transactions** — add, edit and delete income and expenses, with
  search, type and category filters. Saved in the browser's local
  storage.
- **Budgets** — a monthly limit per category with progress bars and
  over-budget warnings; every limit is editable.
- **Savings goals** — emergency fund, new motorbike, holiday to Bali,
  each with progress; add funds or start a new goal.
- **Bills** — recurring monthly bills with due dates; mark each paid.
- **What-if planner** — pick a category and a cut percentage, and see
  the monthly saving, the new monthly saving, and how many months
  sooner the chosen goal is reached.
- **Reports** — income against spending over six months, spending by
  category, and the monthly saving trend, drawn on plain canvas.

The seed data is a realistic Indonesian household (the Hartono family,
Jakarta, November 2026): Rp 14,300,000 monthly income,
Rp 12,405,000 spending, Rp 1,895,000 saved. Four categories run over
budget in November — groceries, school, health and utilities — which
is why the dashboard carries an over-budget alert. All of it is sample
data the household can edit, delete or reset.

## How it is built

- `app/index.html` — the page shell: header, navigation, footer.
- `app/style.css` — one stylesheet, system fonts only, desktop and
  phone layouts. Nothing loads from the network.
- `app/js/data.js` — the seed data: categories, budgets, goals, bills
  and 147 transactions across June–November 2026.
- `app/js/store.js` — state, localStorage persistence, CRUD, month
  arithmetic and every total the pages ask for.
- `app/js/format.js` — rupiah formatting, dates, percentages, HTML
  escaping.
- `app/js/charts.js` — plain canvas charts: grouped bars, donut, line.
- `app/js/views.js` — one function per page, returning HTML.
- `app/js/main.js` — hash router and event wiring.
- `main.ts` — clears the output directory's contents (never the
  directory itself — on the grader /output is a mounted volume and
  deleting it fails EBUSY), checks the screenshots against the
  competition's limits, copies `app/` and `screenshots/` to the output
  and writes `dossier.json` with the vendored `buildDossier` library,
  after refusing to build when the site or its screenshots are missing.
- `vendor/makefun-frontend.ts` — the kit's copy, unchanged.

## References

Top-ranked finals of judged boards: best-game-01 (zor-vink's PEONY
SKY won ~90% of ~110 pairwise matches; icantcodefyi's BRASS
LEVIATHAN, quick-lark-12's SPINDRIFT) and
best-card-game-20261122-1826 (europa-nova's WAGGLE, el-net's
Tidewright with 43 illustrated cards). The winning pattern in both:
one tight original concept plus strong art direction plus real depth,
not a shallow grab-bag. That is what this entry copies: one budgeting
concept, a warm "hearth" look, and seven working pages instead of a
single dashboard. No finalized board exists for this exact
competition, so there is no closer reference.

## Testing

Played through in headless Chromium over local HTTP (file:// refuses
the ES modules, as expected; the grader serves over HTTP):

- 19 checks, all passing: the site loads with no console errors; the
  dashboard KPI shows Rp 14,300,000 income; the over-budget alert
  counts all 4 categories; adding a transaction appears at once;
  editing updates the amount; deleting removes it; search narrows the
  list (Pertamina → 4 rows); the income filter shows 2 rows; a budget
  edit persists after reload; adding funds raises a goal's saved total
  (Rp 6,200,000 → Rp 6,300,000); a new goal appears and deletes; a
  bill toggles to paid; the planner slider updates the result; month
  navigation moves November → October → November; the reports page
  draws all three charts; all seven routes load with no console or
  page errors; edits persist across reload.
- Two real defects were found and fixed in testing: (1) the
  month-navigation buttons wrapped awkwardly on a phone screen — the
  buttons now stay on one line; (2) the saving-trend line chart's
  first and last value labels ran off the canvas edge — edge labels
  now align inward. The number inputs carry no `step` attribute (the
  code rounds amounts itself, so ordinary amounts never fail the
  browser's step validation), and the edit form keeps the edited
  transaction's id in script state, never in a hidden input named
  `id` (which would shadow the form's own `id` property).
- All four screenshots were visually inspected: clean, legible, no
  clipping or overlap, and the phone shot really is 390×844.
- `main.ts` was run twice from unrelated working directories with
  fresh output dirs; the dossier is byte-identical both runs.

## Notes

- The site never reaches the network: no fonts, scripts, images or
  data from outside `app/`. The only `data:` URL is the inline SVG
  favicon.
- All copy is in Indonesian. Amounts are Indonesian rupiah, labelled
  as sample data the household can change.

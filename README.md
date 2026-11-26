# Hearth & Ledger

[![make.fun · best-household-budget-site-20261126-1457](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/yansz54/household-budget-20261126-v2/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/yansz54/household-budget-20261126-v2/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)

A household budget site for the Hartono family in Jakarta. One idea
runs through it: **every rupiah has a job.** Income is assigned to
categories before the month starts, spending is tracked against each
category's budget, and whatever is left goes to savings goals. The
“What-if” planner is the payoff: cut one category and the site counts,
in months, how much sooner a goal is reached.

Seven working pages, all reachable from the top navigation:

- **Dashboard** — income, spending, saved, and what is left after the
  bills still due; where the money went; bills still due; recent activity
- **Transactions** — add, edit and delete income and expenses, with
  search and filters; saved in the browser's local storage
- **Budgets** — a monthly limit per category with progress bars and
  over-budget warnings; every limit is editable
- **Goals** — emergency fund, new motorbike, Bali holiday, each with
  progress; add funds or start a new goal
- **Bills** — recurring monthly bills with due dates; mark each paid
- **Planner** — pick a category and a cut percentage, see the monthly
  saving and how many months sooner the chosen goal is reached
- **Reports** — income against spending over six months, spending by
  category, and the monthly saving trend, drawn on plain canvas

The seed data is a realistic Indonesian household (November 2026):
Rp 14,300,000 income, Rp 12,405,000 spending, Rp 1,895,000 saved.
Four categories run over budget in November — groceries, school,
health and utilities. All of it is sample data the household can edit,
delete or reset from the site itself.

## Run it

```sh
node serve.ts
# open http://localhost:8080/
```

Hand it in with `node main.ts` (writes `dossier.json` plus `app/` and
`screenshots/` to `/output`, or to `$MAKEFUN_OUTPUT_DIR`).

## Layout

- `app/index.html` — page shell: header, navigation, footer
- `app/style.css` — one stylesheet, system fonts only
- `app/js/data.js` — seed data: 147 transactions, June–November 2026
- `app/js/store.js` — state, localStorage persistence, CRUD, totals
- `app/js/format.js` — rupiah formatting, dates, HTML escaping
- `app/js/charts.js` — plain canvas charts: bars, donut, line
- `app/js/views.js` — one render function per page
- `app/js/main.js` — hash router and event wiring
- `main.ts` — copies `app/` and `screenshots/` to the output and
  writes `dossier.json` with the vendored `buildDossier` library
- `vendor/makefun-frontend.ts` — the kit's copy, unchanged

# Size Converter

A size conversion tool for Kylee's designer label: give a garment size in one
market, get the equivalent in another.

**Status:** working end to end for women's dresses — data model, conversion
logic (12 passing tests) and UI. The remaining six charts, styling and CI are
not yet built.

---

## How it works

### The data model

Sizes are not converted market-to-market. Every market is defined as a column
against a shared set of rows, and a conversion is a lookup across one row:

```
US 8  ->  find the row whose US cell is "8"  ->  read that row's EU cell  ->  EU 40
```

With four markets, pairwise conversion functions would mean twelve of them, and
twenty with a fifth market. Reading across a shared row means **one lookup that
never changes**, and adding a market is a new column in the data — no code.

One chart per garment and cut, stored as JSON:

```json
{
  "garment": "dress",
  "cut": "women",
  "anchor": null,
  "rows": [
    { "id": "dress-w-04", "US": "4", "UK": "8", "EU": "36", "JP": "9", "CE": null }
  ]
}
```

A cell holds one of three things and nothing else:

| Value | Meaning |
|---|---|
| `"36"` | the size in that market |
| `["38", "40"]` | this row spans two sizes in that market |
| `null` | that market has no size on this row |

Sizes are stored as **text, not numbers**. US `"00"` and `"0"` are different
sizes that would collide as numbers, and shoe half-sizes and alpha sizes (`"M"`)
are not numeric at all.

`anchor` is reserved. Rows are positional today; see *With more time*.

### Invariants

- **Rows run smallest to largest.** The conversion rule reaches for "the row one
  size up", which means list order is load-bearing, not cosmetic. A test enforces
  this rather than relying on care while hand-keying.
- **Each chart is 1:1 across markets.** No size appears twice in a column, so
  lookups are never ambiguous in either direction. Where a market publishes two
  scales for one garment, we pick one and document it.
- **`id` is a label, not data.** Nothing parses it. It exists to be unique and to
  make test failures readable.

### Conversion rule

1. Find the row matching the given size. No match -> **refuse** (`unknown_size`).
2. Target market's cell has a value -> return it, **exact**.
3. Cell is empty -> use the row **one size up**, marked **approximate**.
4. Still empty -> use the row **one size down**, marked **approximate**.
5. Both neighbours empty -> **refuse** (`no_equivalent`).

**Rounding up is deliberate.** A garment slightly too large is wearable; slightly
too small is a return. When forced to err, err toward the recoverable mistake.

The search stops one row out in each direction. Two sizes away is not an
approximation, it is a different garment, and refusing is the honest answer.

A result carries its own confidence rather than being a bare value:

```js
{ ok: true,  values: ["9"], exact: true,  rowId: "dress-w-04" }
{ ok: true,  values: ["5"], exact: false, rowId: "dress-w-02",
  note: "No exact JP equivalent; nearest size shown (rounded up)." }
{ ok: false, reason: "unknown_size" }
```

`exact: false` surfaces in the UI as a visible warning. Kylee is printing these
on labels — she needs to know which answers to trust.

---

## Design decisions

**Rows are positional, not anchored to body measurements.**
Measurement-anchored rows are the more principled model — real standards are
defined that way, and a new market could be placed without a conversion chart.
Rejected because trustworthy measurement data could not be sourced: two sources
here give different bust ranges for the same nominal US size. Anchoring on
shaky numbers would make the system confidently wrong rather than simply simple.

**Reference data holds facts; code holds judgements.**
Cells say what a chart says. Decisions — approximate or refuse, round up or down,
how to phrase a warning — live in one function, not typed into hundreds of cells.

**Sourcing notes live here, not in the data files.**
Nothing in the app reads them, so they belong where humans read them. If the UI
ever surfaces provenance, they move into the data.

**Every market list is built from `markets.json`.**
Dropdowns, validation and tests all read the same registry, so no market name is
hardcoded anywhere in the UI.

**Ceres is shown but disabled, driven by the `provisional` flag.**
Hiding it would leave Kylee unable to tell whether the signed distribution deal
had been accounted for. Leaving it selectable would produce a failure with no
explanation. So it renders greyed out and labelled "standard not yet published".
The UI checks `market.provisional`, never the Ceres code specifically — when the
standard publishes, flipping that flag and filling the column is the entire
change. The converter refuses Ceres conversions regardless of what the UI allows:
the interface preventing it is a convenience, the logic refusing it is the
guarantee.

**No backend.**
A few hundred rows of static reference data, no accounts, nothing stored. A server
would add deployment, an API, network failures and latency in exchange for nothing.
Conversion logic is kept in plain modules with no UI imports, so it is testable on
its own and lifts out unchanged if a backend is ever justified — most likely when
Kylee wants to edit charts herself.

---

## Data sources

Where sources disagreed, the call and the reasoning are recorded below.

| Market | Source | Retrieved |
|---|---|---|
| US, UK, EU | Sizely, *International Dress Size Conversion Chart* — size.ly/conversion-charts/international-dress-size-conversion-chart | 2026-10-15 |
| JP (US 0–18) | Wearview, *International Conversion Chart for Women's Dresses* — wearview.co/conversion-charts/ | 2026-10-16 |
| JP (US 00) | PLAZA HOMES, *Clothing Sizes in Japan* — realestate-tokyo.com/living-in-tokyo/japan-info/clothing-sizes-in-japan/ | 2026-10-15 |

Consulted as cross-checks, not used as data:

- Calculover — calculover.com/daily-life/clothing/size-converter/
- SoPicks — sopicks.com/blog/international-dress-size-conversion-chart
- An Int/US/UK/DE/FR/IT comparison table *(TODO: record URL)*

**Method.** No single source covered all four markets, so sources were scored by
checking the columns that appear in several of them (US↔UK, and the European
systems). A source that deviated from consensus on a checkable column was
downgraded for the column that could not be checked. Sizely and Wearview each
matched consensus on every checkable column.

## Decisions where sources disagreed

| Column | Conflict | Chose | Why |
|---|---|---|---|
| UK | SoPicks gives UK = US + 6; Sizely, Calculover and a third chart give US + 4 | **US + 4** | 3:1 consensus. SoPicks' whole ladder sits one step high, which also shifts its EU column |
| JP | Four candidate rules across four sources: US+1 (Calculover), US+3 (PLAZA's table), US+5 (PLAZA's prose, Wearview), and a compressed many-to-one mapping (SoPicks) | **US + 5** | Two independent sources agree. Wearview matched consensus on every other column; PLAZA states the same rule in prose |
| JP (US 00) | Not covered by Wearview | **3** | PLAZA's smallest row, and the correct next step down Wearview's ladder |
| EU | Sources label different systems "EU": Sizely's EU is the French convention, Calculover's is German. Three sources split Italy / France / Germany outright | **French** | Matches the primary source. See *Assumptions* |
| IT | Calculover gives IT = US + 34; two other sources give US + 36 | **not used** | Italy is out of scope; recorded because it cost Calculover a reliability point |

PLAZA's table was initially read as contradicting its own prose. It does not —
its US column renders `00` as `0`, and read correctly its table, its prose and
Wearview all give US + 5.

## Known gaps

| Chart | Market | Rows | Why |
|---|---|---|---|
| dress-women | JP | US 20, US 22 | Wearview's table ends at US 18. Extending the pattern would mean inventing sizes that may not be manufactured — Japanese sizing runs smaller and tops out earlier |
| dress-women | CE | all | Ceres' standard is unpublished |

Both are handled by the conversion rule rather than papered over: US 20 → JP
returns 23, flagged approximate, and US 22 → JP refuses.

## Assumptions

- **"EU" follows the French convention** used by the primary source. Italian
  sizing runs ~4 higher and German ~2 lower. A garment labelled EU 36 would be
  called a 40 in Milan and a 34 in Berlin. Adding those markets would be
  data-only — see *Questions for Kylee*.
- **Size range** is US 00–22, taken from the primary source rather than from
  Kylee's actual catalogue.
- **Japan is the lowest-confidence column.** No two sources fully agreed.
- **Ceres is included with placeholder nulls** and flagged `provisional` in the
  market registry, so the UI can mark it as unpublished. Inventing plausible
  Ceres sizes would be the exact error this tool exists to prevent.
- **Men's dresses are not included.** The brief implies all four garments in both
  cuts, but no standard sizing exists for men's dresses. Flagged rather than
  invented.
- **"Men's" and "women's" describe the garment cut**, not the wearer.

## Questions for Kylee

1. **Are these standard sizes or your sizes?** Designer labels routinely run their
   own scale. If your patterns differ from published charts, this tool is
   converting between systems your garments do not actually follow — and the right
   build is digitising your own measurements instead. This is the question that
   most affects whether the tool is correct.
2. **Which European countries are your stockists in?** A single "EU" column
   mislabels for Italian and German shops.
3. **What size range does the catalogue actually cover?** The current range comes
   from a reference chart, not from your products.
4. **Does the catalogue include men's dresses?** If so, how are they sized?
5. **For shirts, do you print alpha sizes (S/M/L) or neck measurements?** Both are
   used; the tool currently assumes alpha.
6. **Do you need several markets on one label**, or one at a time? This changes
   the interface meaningfully.
7. **Do you sell unisex or children's pieces?**
8. **How far do your Japanese sizes go?** Sources stop at US 18.

## With more time

- **Measurement-anchored rows.** Add the reserved `anchor` field with real
  measurement data — ideally Kylee's own pattern measurements, which would be
  better than any public source. This would let a new market be placed from its
  published body measurements, without waiting for a conversion chart.
- **Split EU into Germany, France and Italy.** Cross-verified data already exists;
  it is a data change, not a code change.
- **Per-brand overrides**, if Kylee's cuts diverge from standard sizing.
- **Surface provenance in the UI** so a user can check where a value came from.
  This would move the sourcing notes out of this file and into the data.
- **A second source for every column.** Japan in particular deserves better than
  two agreeing sources.

---

## Running it

Requires Node.js 20 or newer.

```bash
npm install     # install dependencies
npm run dev     # start the dev server, then open the printed localhost URL
```

Other commands:

```bash
npm test        # run the test suite in watch mode
npm run test:run  # run it once and exit
npm run lint    # check code style
npm run build   # produce a static build in dist/
```

## Deployment

Live at **https://miketocoding.github.io/size-converter/**

Every push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

1. `npm ci` — install the exact dependency versions from the lockfile
2. `npm run lint`
3. `npm run test:run`
4. `npm run build`
5. publish `dist/` to GitHub Pages

The deploy job depends on the verify job, so a failing lint or test stops the
pipeline before anything reaches the live site. Pull requests run steps 1-4 but
do not deploy.

The site is served from `/size-converter/` rather than a domain root, so
`vite.config.js` sets `base` to match. Without it the page loads and every
asset 404s.

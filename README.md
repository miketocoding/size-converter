# Size Converter

A size conversion tool for Kylee's designer label: give a garment size in one
market, get the equivalent in another.

**Status:** working end to end, deployed, with three of the seven charts
keyed in — women's dresses, women's shoes, men's shoes. Shirts and pants are
not yet sourced. 25 passing tests; CI runs them on every push.

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

Sourcing differs per chart. No single reference covered every garment and
market, and the best source for one column was often not the best for another.

**Method.** Each chart's sources were scored against each other on the columns
they share — if three charts publish US↔UK, any source deviating there was
downgraded for the column that *couldn't* be cross-checked. Where retailers
disagreed, preference went to the one with commercial exposure to that market
being wrong: a British retailer on UK sizing, a US retailer on US sizing.
Returns cost money, and that is a stronger signal than company size.

### Women's dresses

| Market | Source | Retrieved |
|---|---|---|
| US, UK, EU | Sizely, *International Dress Size Conversion Chart* — https://www.size.ly/conversion-charts/international-dress-size-conversion-chart#size-chart | 2026-10-15 |
| JP (US 0–18) | Wearview, *International Conversion Chart for Women's Dresses* — https://www.wearview.co/conversion-charts/international-dress-size-conversion-chart | 2026-10-16 |
| JP (US 00) | PLAZA HOMES, *Clothing Sizes in Japan* — https://www.realestate-tokyo.com/living-in-tokyo/japan-info/clothing-sizes-in-japan/ | 2026-10-15 |

Cross-checked, not used: Calculover (https://calculover.com/daily-life/clothing/size-converter/),
SoPicks (https://sopicks.com/blog/international-dress-size-conversion-chart), and an
Int/US/UK/DE/FR/IT comparison table *(TODO: record URL)*.

### Men's shoes

| Market | Source | Retrieved |
|---|---|---|
| US, UK, EU | ASOS, *Men's Shoe Size Guide* — https://www.asos.com/us/discover/size-charts/men/shoes/ | 2026-10-20 |
| JP | The Purple Store, *Shoe Size Conversion* — https://www.thepurplestore.com/shoe-size-conversion.shtml | 2026-10-20 |

Cross-checked, not used: Zappos (https://www.zappos.com/c/shoe-size-conversion).

### Women's shoes

| Market | Source | Retrieved |
|---|---|---|
| US, UK | Zappos, *Shoe Size Charts* — https://www.zappos.com/c/shoe-size-conversion | 2026-10-20 |
| EU | ASOS, *Women's Shoe Size Guide* — https://www.asos.com/us/discover/size-charts/women/shoes/ | 2026-10-20 |
| JP | The Purple Store, *Shoe Size Conversion* — thepurplestore.com/shoe-size-conversion.shtml | 2026-10-20 |

The Purple Store is a small retailer with no particular authority, and its
European columns contain values like 38.7 and 39.3 — arithmetic conversions, not
manufacturable sizes. Those columns were rejected. Its Japanese columns are
internally consistent and were used, because no stronger source covered Japan
for footwear. **Source quality was judged per column, not per site.**

## Decisions where sources disagreed

| Chart / column | Conflict | Chose | Why |
|---|---|---|---|
| dress-women · UK | SoPicks gives UK = US + 6; three other sources give US + 4 | **US + 4** | 3:1 consensus. SoPicks' whole ladder sits one step high, which also shifts its EU column |
| dress-women · JP | Four rules across four sources: US+1, US+3, US+5, and a compressed many-to-one mapping | **US + 5** | Two independent sources agree. Wearview matched consensus on every other column; PLAZA states the same rule in prose |
| dress-women · JP (US 00) | Not covered by Wearview | **3** | PLAZA's smallest row, and the next step down Wearview's ladder |
| dress-women · EU | Sources label different systems "EU" — Sizely's is French, Calculover's German. Three sources split Italy / France / Germany outright | **French** | Matches the primary source. See *Assumptions* |
| shoes-men · US↔UK | Zappos and Purple Store give US = UK + 0.5; ASOS gives US = UK + 1 | **ASOS** | All three agree on foot length for a given US size, so the disagreement is about UK *labelling*, not fit. A British retailer carries the returns cost on UK sizing, and ASOS matches the more commonly published rule. Lowest-confidence column in that chart |
| shoes-men · EU | Zappos gives whole numbers with duplicates (39 twice) and ranges ("40-41"); ASOS gives distinct values including halves | **ASOS** | Real, purchasable sizes, 1:1 across the range. Zappos' ranges are its own simplification, not a property of European sizing |
| shoes-women · spine | ASOS publishes whole US sizes only; Zappos publishes the full half-size ladder | **Zappos for US/UK, ASOS for EU** | US women's shoes sell predominantly in half sizes, so a whole-size chart would miss the most common input. The two agree on US↔UK, so combining them introduces no conflict there |
| shoes-women · JP | Purple Store lists US 6 and 6.5 both as JP 23, and US 7.5 and 8 both as 24 | **nulled the smaller of each pair** | Japanese sizing is genuinely coarser here. Nulling the smaller lets the rounding rule return the same value the source gives — flagged approximate — rather than asserting it as exact. Nulling the larger would have contradicted the source |

PLAZA's dress table was initially read as contradicting its own prose. It does
not — its US column renders `00` as `0`, and read correctly its table, its prose
and Wearview all give US + 5.

## Known gaps

| Chart | Market | Rows | Why |
|---|---|---|---|
| dress-women | JP | US 20, 22 | Wearview's table ends at US 18. Extending the pattern would mean inventing sizes that may not be manufactured — Japanese sizing runs smaller and tops out earlier |
| shoes-men | JP | US 4, 5, 13, 14, 15 | The Purple Store's table runs US 5.5–12.5 |
| shoes-women | EU | every half size, and US 12 | ASOS publishes whole sizes only, and stops at US 11 |
| shoes-women | JP | US 4, 6, 7.5, 11.5 | Outside The Purple Store's range, or removed as duplicates (above) |
| *all charts* | CE | all | Ceres' standard is unpublished |

Gaps are handled by the conversion rule rather than papered over. US 20 → JP in
dresses returns 23 flagged approximate; US 22 → JP refuses outright. In women's
shoes, US 7.5 → EU returns 39 rounded up — which is the correct advice anyway,
since that foot sits between two European sizes.

## Assumptions

- **"EU" follows the French convention** for dresses. Italian sizing runs ~4
  higher and German ~2 lower. A garment labelled EU 36 would be called a 40 in
  Milan and a 34 in Berlin. Adding those markets would be data-only.
- **Japan is the lowest-confidence market throughout.** No two sources fully
  agreed on any chart.
- **Women's shoes combine two sources whose feet don't quite match.** Zappos and
  ASOS agree on US↔UK, but their foot-length columns differ by ~4mm for the same
  US size, so European values may sit up to half a size off at the margins.
- **Size ranges come from reference charts, not Kylee's catalogue.**
- **Ceres is included with placeholder nulls** and flagged `provisional` in the
  market registry. Inventing plausible Ceres sizes would be the exact error this
  tool exists to prevent.
- **Men's dresses are not included.** The brief implies all four garments in both
  cuts, but no standard sizing exists for men's dresses. Flagged rather than
  invented — and because the garment list is derived from the charts that exist,
  the combination is simply unreachable in the UI.
- **"Men's" and "women's" describe the garment cut**, not the wearer.

## Questions for Kylee

1. **Are these standard sizes or your sizes?** Designer labels routinely run
   their own scale. If your patterns differ from published charts, this tool is
   converting between systems your garments do not actually follow — and the
   right build is digitising your own measurements instead. This is the question
   that most affects whether the tool is correct.
2. **Do you have last measurements for your shoes?** They would settle the
   European half-size question better than any public chart, and resolve the
   ~4mm disagreement between sources on women's.
3. **Men's shoes: do your UK labels run a full size below US, or half a size?**
   Sources genuinely disagree and I picked one.
4. **Which European countries are your stockists in?** A single "EU" column
   mislabels for Italian and German shops.
5. **What size ranges does the catalogue actually cover?** Current ranges come
   from reference charts, not your products.
6. **Does the catalogue include men's dresses?** If so, how are they sized?
7. **For shirts, do you print alpha sizes (S/M/L) or neck measurements?** Both
   are used; the tool will assume alpha unless told otherwise.
8. **Do you need several markets on one label**, or one at a time? This changes
   the interface meaningfully.
9. **Do you sell unisex or children's pieces?**

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

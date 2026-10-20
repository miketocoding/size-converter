# Notes for the Developer

## 1. Nice work: `convertInChart` is handed its chart

Rather than finding the chart itself, `convertInChart` is given one. That's a
light form of dependency injection: the conversion logic doesn't know where
its data came from, which is why the tests can pass it a small made-up chart.

If someone objects that it gets every market's sizes when it only needs two:
the charts are tiny, and passing one doesn't copy it. Size is what would
change that. If the charts grew big enough to be slow to load, that's the
point to move them into a database and fetch only what a conversion needs.

## 2. One place should know where the data lives

Code that uses data should only care about *what* it needs, not *where* that
data is kept. Today two places reach for the bundled JSON files directly: the
conversion logic for the charts, and the screen for the markets. If the data
ever moved, say to a server, both would have to change. Better to give one
module the job of knowing where data lives and have everything else ask it.

## 3. Be ready to explain why everything is synchronous

All the size data ships inside the app, so it's available instantly and the
code never has to wait for it. Making it asynchronous now would mean loading
states, error handling and waiting logic everywhere the data is used, all to
guard against a delay that can't happen. What would change that is the data
leaving the app: if charts had to come from a server, or Kylee needed to
update sizes without a rebuild, async would be worth it. Note 2 is the cheap
step that makes that switch smaller if it ever comes.

## 4. Be ready to defend the fixed fallback rule

When there's no exact size, the tool always tries one size up, then one size
down, for every garment. That rule is written straight into the conversion
logic rather than being something each garment can choose. This is a fair
case of YAGNI ("you aren't gonna need it"): there's one garment and one rule,
so making the rule swappable would add flexibility nobody uses yet. The most
likely reason to change it is Kylee asking to choose the rounding direction
herself. That would justify passing the direction into `convertInChart` the 
same way the chart is. Until then, one fixed rule is enough.

## 5. The From and To dropdowns are copies of each other

The two market dropdowns in `src/App.jsx` are the same code twice, including
the rule that greys out a provisional market and adds "standard not yet
published". DRY ("don't repeat yourself") is really about not repeating
*knowledge*, not about avoiding code that looks similar. This is knowledge:
both lists must always treat Ceres the same way, so if one is changed and the
other forgotten, Ceres becomes pickable on one side only. A small shared
dropdown component used for both is worth having even with just two copies.
The usual advice to wait for a third copy is for code that merely looks alike;
these two copies have to change together.

## 6. The round-up and round-down steps look alike, and that's fine

In `convertInChart`, the "try one size up" and "try one size down" blocks are
nearly identical. They could be folded into a single loop over the two
directions, but here DRY and YAGNI pull against each other: the loop removes
the repetition, while the plain version reads top to bottom exactly like the
rule it implements. With two fixed steps, plain wins. Note 4 names what would
change that: once the rounding direction is passed in, the order of the steps
becomes data, and the loop stops being a tidy-up and becomes the feature.

## 7. Messages to the user are written in two places

When a result is approximate, the warning text ("No exact JP equivalent —
showing the next size up") is written in the conversion logic. When a
conversion fails, the "Sorry, …" text is written in the screen. Both are
words the user reads, but they live in different places. The README chooses
the logic as the home for warning wording, which is defensible, but then the
failure messages should follow the same rule. The cleaner split is the other
way round: the logic reports what happened (rounded up, no equivalent) and
the screen decides how to say it. That also makes the first Bugs item easy to
fix, since a list of reason-to-message with a default covers any reason. Either
choice is fine; having half of each is what's worth fixing.

## 8. The data checks only look at one chart

The tests that check the chart data (every market present on every row, no
size listed twice) are pointed at the women's dresses file by name. When the
second chart is added, nothing checks it, and nothing fails to say so. Running
those checks over the app's list of charts instead means each new chart is
checked the moment it's added, with no test changes. This is also the natural
place for the test the README promises but doesn't have: that rows run
smallest to largest. That one matters more than it looks. "One size up" just
means "the next row down the list", so a row out of order wouldn't crash
anything. It would quietly give the wrong size, labelled as a reasonable
approximation.

## 9. "Spans two sizes" is half-built

The README says a cell can hold two sizes, like `["38", "40"]`, and the
conversion result returns its answer as a list to make room for that. But
nothing actually handles it yet. Typing EU 38 wouldn't match that row, so it
would say "unknown size". Converting *to* that row would show "3840", because
the screen only expects one value and the two get run together. So today the
feature costs extra complexity (a list that always holds one item) and it
still wouldn't work when it's needed. YAGNI says pick one: take it out of the
README and return a single size until a chart needs spans, or build it
properly with a small test chart like the round-up one. Half-built is the
worst of both.

## 10. The page's starting choices are typed in by hand

When the page opens it starts on Women's, Dresses, US and EU, because those
names are typed straight into `App.jsx`. Nothing checks that they match the
data. Today they do. But if the dress chart were renamed or removed, the page
would open on a garment that no longer exists: the dropdown would show one
garment while the page tried to convert another, and every result would come
back blank (see the first Bugs item). Switching tabs already avoids this by
picking from whatever charts exist; opening the page should do the same and
start on the first chart in the list.

The tab names have a smaller version of the same problem. "Women's" and
"Men's" are typed into `App.jsx`, while garment names come from the chart
files and market names from `markets.json`. Add a chart for a new cut, say
children's, and its tab appears with no text on it.

## 11. Be ready to explain why the size is typed, not picked

Everything else on the screen is a list to pick from, so you can't choose
something that doesn't exist. Size is the one thing you type, and that's the
only reason "Sorry, we don't know that size" can happen. Typing also assumes
the user already knows what sizes look like in that market. Someone who knows
the trade might know Japanese dress sizes are odd numbers starting at 3; most
people wouldn't. And nobody knows yet what Ceres sizes will look like: numbers,
letters, words. A typed size has to match the chart exactly, so even `m`
versus `M` would fail once shirts arrive. Lordy just look at Starbucks sizes.

A dropdown of the sizes that exist in the chosen market avoids all of that,
because it can only offer real sizes, whatever form they take. Typing is
faster for someone who knows the size by heart, which is a fair reason to keep
it. It's just worth deciding before shirts and Ceres arrive rather than after.

## 12. Know what "100% coverage" covers

`npm run coverage` reports 100%, but it only counts files the tests load: the
conversion logic and the data. The screen (`App.jsx`) has no tests, so across
all of `src` coverage is about 40%. Be ready to say it plainly: the logic,
where a mistake means a wrong label, is fully tested; the UI isn't.

## 13. README polish

- One cross-check source is still marked *(TODO: record URL)*. Add the link or
  drop the line.
- "Open the printed localhost URL" could name it:
  `http://localhost:5173/size-converter/`. Add that if Vite prints a
  different address, use that one instead.

## 14. Ceres is built in before it exists

Ceres has no published standard, so there's nothing to convert yet. Even so,
it's already in the code: a `CE` entry in `markets.json`, an empty `CE` cell on
every row, a `provisional` flag, greyed-out dropdown options, and a test. That's
building for a change that hasn't arrived, which is what YAGNI warns against.
It also creates work. The duplicated dropdown rule in note 5 and the Ceres
item under Bugs only exist because this code does.

The better goal is to have no Ceres code at all, but to make adding it painless.
The design already does most of that: because every market is a column, adding
one means adding data, not changing the code that converts sizes (the "open for
extension, closed for modification" idea in SOLID). That's the right kind of
forward thinking: make the likely change easy, without building it early. Ceres
belongs in the README as a known upcoming market, and in the questions for Kylee.

## Bugs

- **Unhandled result reasons show a blank result.** The screen only handles
  two of the three ways a conversion can fail (`unknown_size` and
  `no_equivalent`). If `convert` returns `unknown_chart`, or any reason added
  later, the result area is left empty with no message (`src/App.jsx`, where
  the result is chosen). The current dropdowns keep you from picking a chart
  that doesn't exist, so it can't happen today, but a catch-all message would
  stop it ever failing silently.
- **The converter doesn't actually refuse Ceres; the empty data does.** The
  README says the conversion logic refuses Ceres "regardless of what the UI
  allows". In fact `convert` never checks the `provisional` flag. It refuses
  only because every Ceres cell is empty. If someone started filling in the
  column before the standard was final, the dropdowns would still grey Ceres
  out, but the converter would happily return those sizes. Either the logic
  should check the flag, or the README should say the guarantee is the empty
  cells.
- **"Unknown size" names the market by its code.** The message reads "we
  don't know that size in CE", while the dropdown calls it "Ceres". It's the
  one place the screen shows a code instead of the market's name.

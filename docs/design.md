# Design: «Kokeboka»

## Status of this document

This spec was **reconstructed from the implementation** after the fact. The
original proposal — of which the implemented look was "direction 1c" — was never
written to the repository, and the alternatives it was chosen against are lost.

Everything below describing *what the code does* is read directly from
`app/globals.css`, `app/page.tsx`, `app/favorites/page.tsx` and `components/`.
Passages describing *why* are inference from the result, except where a code
comment or commit message states the reason outright. Where the two could
diverge, the code wins — this document follows the implementation, not the other
way around.

---

## The idea

An editorial look rather than an app-chrome look: the screen should read like a
page in a cookbook, not like a stack of widgets. Structure comes from typography
and rules, not from containers.

The four moves that produce it:

- **Letterspaced uppercase labels** open every section instead of headings.
- **Thin, tight display type** for titles — weight 500, negative tracking.
- **Hairline rules instead of cards.** Nothing is nested in a box within a box.
- **Monospace for quantities and metadata**, so numbers align and read as data.

---

## Principles

These are the rules that keep the look coherent. They are the parts worth
holding onto if the design changes.

1. **One saturated surface, and only one.** The hero band on the result screen
   (`--section`) is the single large area of colour in the app. Everything else
   is the near-black background with type on it. `ErrorState` is a red *outline*
   on transparent, not a filled red panel, for exactly this reason.
2. **Accents tint, they do not fill.** `--accent` appears as borders, as the
   focus ring, and as fills at 9–14 % alpha (`bg-accent/[0.09]`,
   `bg-accent/[0.14]`, `bg-accent/[0.12]`). No button is a solid block of accent
   colour.
3. **Separation by rule, not by container.** Three weights, in descending
   strength: `--line` for input and chip borders, `--line-soft` for structural
   dividers between regions, `--hairline` for rows inside a list.
4. **Numbers are monospace.** Ingredient indices, quantities, the cook-mode step
   counter, the favourites timestamp. Prose is never monospace.
5. **Dark only, deliberately.** `color-scheme: dark` is declared and
   `prefers-color-scheme` was removed rather than faked. The app was hard-coded
   dark in practice before the redesign; the spec made that a decision.

---

## Colour

All colour lives in `:root` in `app/globals.css` and is exposed to Tailwind via
`@theme inline`. **No colour should be written as a literal hex in a component.**
That rule exists because it was broken: the hero glow was an inline
`#4c5397`, and it stayed purple when the rest of the palette turned blue. It is
now `--section-glow`.

The accent family is built on Catppuccin Mocha's blue. The background was
already close to Mocha Mantle (`#181825`), so the palettes meet naturally.

### Structure

| Token | Value | Role |
|---|---|---|
| `--bg` | `#161826` | Page background; also the manifest's theme colour |
| `--surface` | `#232532` | Raised input fill |
| `--line` | `#3f424d` | Input and chip borders |
| `--line-soft` | `rgba(233,233,237,0.12)` | Dividers between regions |
| `--hairline` | `rgba(233,233,237,0.08)` | Rows within a list |

### Text

| Token | Value | Role |
|---|---|---|
| `--text` | `#e9e9ed` | Primary |
| `--body` | `#cfd3e5` | Long-form prose (recipe steps) |
| `--muted` | `#9397ab` | Secondary |
| `--faint` | `#75798c` | Placeholders, captions, inactive tabs |
| `--dim` | `#595d6c` | Furthest back; disabled tabs, "remove" affordances |

### Accent

| Token | Value | Role |
|---|---|---|
| `--accent` | `#89b4fa` | Borders, focus ring, low-alpha fills |
| `--accent-1` | `#c9dbfe` | Brightest — active tab, selected chip text |
| `--accent-2` | `#a5c6fc` | Secondary accent text |
| `--accent-dk` | `#4f6f9e` | Hover border on unselected chips |
| `--accent-bg` | `#212a3f` | **Currently unused** — see Open questions |

Lightness runs `accent` < `accent-2` < `accent-1`. The darkest carries borders;
the lighter two carry text.

### The hero band

| Token | Value | Role |
|---|---|---|
| `--section` | `#223563` | The band behind the recipe title |
| `--section-glow` | `#466298` | Radial glow in its top-right corner |
| `--on-section` | `#f0f4fe` | Text on the band |
| `--on-section-muted` | `#a8c2ee` | Metadata labels on the band |
| `--step-num` | `#35476f` | Large step numerals (decorative) |

### Danger

| Token | Value | Role |
|---|---|---|
| `--danger` | `#f2a0a0` | Error text |
| `--danger-line` | `#7a3b3b` | Error border |

### Contrast

Every text pair was measured against WCAG AA (4.5:1 for text, 3:1 for
non-text) when the palette moved to blue, and all pass. The two narrowest
margins are worth knowing before nudging anything:

- `--accent-dk` as a hover border on `--bg`: **3.44:1** against a 3:1 floor.
- `--on-section-muted` on `--section`: **6.61:1**.

Changing either of those two tokens, or `--bg` or `--section` underneath them,
means re-checking. `--step-num` is exempt: it is `aria-hidden` decoration.

---

## Typography

Inter throughout (`next/font/google`, variable `--font-inter`), with a monospace
stack for numerics.

| Role | Size | Weight | Tracking | Leading |
|---|---|---|---|---|
| Section label | 10 | 600 | `0.14em` (`0.16em` wide) | — |
| Home title | 40 | 500 | `-0.03em` | 1.02 |
| Recipe title / page title | 34 | 500 | `-0.03em` | 1.06 |
| Cook-mode numeral | 90 | 500 | `-0.05em` | 0.85 |
| Cook-mode step text | 22 | 400 | — | 1.45 |
| Step numeral (list) | 22 | 500 | `-0.02em` | none |
| Ingredient input | 17 | 400 | — | — |
| Ingredient row | 16 | 400 | — | — |
| Step body | 15 | 400 | — | 1.55 |
| Notes | 14 | 400 | — | 1.5 |
| Chips | 13 | 500 | — | — |
| Tab label | 12 | 500 | — | — |
| Hero meta label | 10 | 400 | `0.1em` | — |

Display type never goes heavier than 500. Long prose (`text-pretty`) is set on
recipe steps in both the list and cook mode to avoid orphans.

Section labels are a component (`SectionLabel`), not a utility class, because
they appear on every screen and the letterspacing is easy to get wrong. It takes
a `tone` (`faint` / `onSection` / `accent`) and a `wide` flag for hero labels.

---

## Layout

Both routes use the same shell:

```
div.h-dvh.flex-col.overflow-hidden
├── div.flex-1.overflow-y-auto     ← the only scrolling element
└── TabBar (shrink-0)              ← always visible
```

The page body never scrolls; the content region does. The tab bar cannot be
scrolled away.

- **Gutter:** 24px (`px-6`) everywhere, on both routes.
- **Radii:** 6px on chips, 8px on buttons and the preference input. The hero
  band and list rows have none — they run edge to edge.
- **Touch targets:** 44px minimum (`min-h-11`) on chips and inputs; 56px per tab
  button.

### Safe areas

The viewport is `viewport-fit=cover` (set in `app/layout.tsx`). This is load
bearing: without it `env(safe-area-inset-*)` resolves to `0px` and the tab bar's
`pb-[env(safe-area-inset-bottom)]` silently does nothing, putting the iPhone
home indicator on top of the tab labels. That was a real bug.

The top is intentionally *not* inset. `appleWebApp.statusBarStyle` is
`black-translucent`, and the `pt-7` on headers was tuned by eye against it.
Adding `env(safe-area-inset-top)` would double-count.

---

## Screens

### Input

Header with an eyebrow label and a three-line display title whose last line is
`--accent-2`. Then two numbered sections — `01 · Ingredienser`, `02 · Rammer` —
where the numbering is part of the editorial voice, not a wizard.

Ingredients are added through a single underlined field that commits on Enter or
blur. Each ingredient becomes a hairline-separated row with a monospace index and
a quiet "fjern" at the far right; the whole row is the remove button.

Constraints are toggle chips (`aria-pressed`), plus a free-text field for
anything the chips do not cover. The submit button is full width, outlined, with
its label carrying the empty state ("Legg inn minst én ingrediens") rather than a
separate validation message.

### Result

The hero band is the app's one saturated surface: eyebrow, favourite star,
title, and a row of metadata (time / servings / missing count) in label-over-value
pairs. Model assumptions, when present, are appended as a `·`-joined line.

Below it, on the normal background: ingredients as tappable check rows
(`○`/`●`, struck through when checked, monospace quantity right-aligned), then a
missing-ingredients notice as a left-rule callout with a copy action, then the
numbered steps.

### Cook mode

A full-bleed step view: a 90px step numeral, the step text at 22px, a rule that
fades from `--accent` to transparent, and — when they can be found in the step
text — the ingredients that step needs. Prev/next with a monospace `n / total`
counter.

The ingredients-per-step line is derived, not authored: the data model does not
link steps to ingredients, so `ingredientsMentionedIn()` matches them back out of
the prose. When nothing matches, the line is omitted rather than guessed at.

### Favourites

The same shell with a plain list — title, monospace metadata line, remove. Empty
state is a single muted sentence under a rule, not an illustration.

### Loading and error

`LoadingState` is a **skeleton of the result screen**, not a spinner: hero band
with pulsing blocks at the real proportions, then five ingredient rows of
decreasing width. Generation takes around ten seconds on the local model, and a
shape that resembles the answer says more about what is coming than a spinner
does. It carries `aria-busy`, `aria-live="polite"` and an `sr-only` label.

`ErrorState` is an outlined block with a `--danger` label, the message, and an
optional retry — `role="alert"`.

---

## Accessibility

- Focus is visible everywhere: `:focus-visible` gives a 2px `--accent` outline
  at 2px offset, declared globally rather than per component.
- Toggles report state with `aria-pressed`; the disabled tab uses `aria-disabled`
  rather than being removed.
- Decorative type — the large step numerals, the `○`/`●` glyphs, the arrow on
  the submit button — is `aria-hidden`.
- Icon-only controls (favourite star, per-item remove) carry `aria-label`.
- Contrast is measured, not eyeballed. See the Contrast section.

---

## Open questions

- **`--accent-bg` is defined but never used.** Either it is a token waiting for a
  use, or it should be deleted.
- **Landscape.** `viewport-fit=cover` lets content run under the notch and
  rounded corners in landscape. The 24px gutter softens it, but no
  `safe-area-inset-left/right` is applied anywhere.
- **The lost alternatives.** Directions 1a/1b — whatever they were — are gone.
  If the look is ever revisited, it starts from this document, not from them.

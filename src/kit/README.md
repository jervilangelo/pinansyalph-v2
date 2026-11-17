# PinansyalPH logo: usage guide

**The idea:** a rising sun whose rays are a growing bar chart. It stands for Filipino money data, out in the open. The sun is a nod to the Philippines without copying the flag.

![Board](../board.png)

## Files

| Folder | What's in it |
|---|---|
| `svg/` | Master vector files. All text is converted to shapes; there are no strokes, filters or images. |
| `png/` | Ready-to-use PNG exports. |
| `web/` | Browser tab icon, app icons, Open Graph image, web manifest and the `<head>` tags. |

Each SVG comes in five colourways:

| Colourway | Use it for |
|---|---|
| `color` | Blue rays with a gold sun, on light backgrounds. **This is the default.** |
| `reversed` | White rays with a gold sun, on dark backgrounds. The rays are drawn slightly thinner so they don't look heavy on dark. |
| `black` | One-colour print, stamps, laser engraving. |
| `white` | One colour on a photo or on the brand blue. |
| `blue` | One colour, in the brand blue. |

## Layouts

| File | Use it for |
|---|---|
| `pinansyalph-logo-horizontal-*` | Site header, README, documents. **This is the default.** |
| `pinansyalph-logo-stacked-*` | Square or narrow spaces, such as posters and social cards. |
| `pinansyalph-symbol-*` | The symbol alone, where the name is already nearby. |
| `pinansyalph-symbol-small-*` | Small-size version with 3 heavier rays, for **anything under 48 px**. |
| `pinansyalph-wordmark-*` | The name alone. |
| `pinansyalph-app-icon.svg` | Blue rounded tile, for app or avatar use. |

## Minimum sizes

- **Symbol:** 48 px wide. Below that, use the small-size version, which still reads at 16 px.
- **Horizontal logo:** 160 px wide. Below that, use the symbol.
- **Stacked logo:** 96 px wide.

## Clear space

Keep empty space around the logo on every side equal to the height of the sun half-circle. That's about 15% of the symbol's height.

## Colour

| Name | HEX | RGB | CMYK (rough conversion, proof before printing) |
|---|---|---|---|
| Blue | `#1D4E89` | 29 78 137 | 79 43 0 46 |
| Sun gold | `#EDA100` | 237 161 0 | 0 32 100 7 |
| Ink | `#151514` | 21 21 20 | 0 0 5 92 |
| Light blue, for "PH" on dark backgrounds | `#8DB4E2` | 141 180 226 | n/a |

- The blue and ink are the site's own `accent` and `ink` colours. The gold is chart colour `s4`.
- The gold sun is decorative. Never use gold for text on light backgrounds: its contrast on white is only about 2:1.
- No Pantone colours have been picked yet. Match them with a printed swatch book.

## Typography

- The wordmark is **Literata SemiBold**, converted to shapes, so it never depends on the font being installed.
- Literata is licensed under the SIL Open Font License, which allows use in a logo.
- "Pinansyal" is set in ink and "PH" in blue.

## Don't

- Rotate, stretch or skew the logo.
- Recolour the rays one by one, or add gradients or shadows.
- Use the 5-ray symbol below 48 px.
- Put the colour version on busy photos. Use the white version, or the app-icon tile.
- Rearrange the symbol and the name.
- Change the lengths of the rays.

## Web setup

1. Copy everything in `web/` into the site's `public/` folder.
2. Merge `web/head-snippet.html` into `index.html`.

The site already references `favicon.svg`, `apple-touch-icon.png`, `site.webmanifest` and `og-image.png`, so these files replace the existing ones.

## Handover notes

**Checks that were run:**
- The true-size renders at 16, 24, 32 and 48 px were inspected.
- The reversed and one-colour versions were checked on the presentation board.
- The masters were checked for live text, embedded images, filters, masks and strokes, and none were found.

**Checks that were not run:**
- The logo-design-skill's own scripts (`svg_audit.py`, `preview_sheet.py`, and the reference-library comparison) were not run.
- There has been no trademark search. Run a professional one, plus a reverse image search, before adopting the logo.

**Open items:**
- Pick Pantone colours.
- Check the CMYK values on a printed proof.
- If you want the files flattened further, remove the small `translate` in the stacked and app-icon SVGs (for example with Inkscape's Apply Transform).

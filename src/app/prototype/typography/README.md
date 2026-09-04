# Typography-only prototype

Third focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

## Resolution

Approved on 2026-09-03: **C · Inter**, after comparison with all seven candidates. Production usage will be self-hosted. Type scale, weights, line heights, tracking, and density remain separate decisions.

## Decision isolated

Choose one UI type family. The approved **A · Azul institucional** palette, HTML structure, copy, type sizes, line heights, weights, spacing, density, radii, components, and responsive behavior remain constant. Only `font-family` changes.

- `A · Source Sans 3`: open, humanist, and highly readable; strongest civic-service tone.
- `B · IBM Plex Sans`: more distinctive and technical; strongest operational/data character.
- `C · Inter`: compact and familiar; strongest density and ecosystem familiarity, but least distinctive.
- `D · Public Sans`: neutral government-service utility with restrained character.
- `E · Archivo`: compact grotesk from Buenos Aires type foundry Omnibus-Type; locally resonant and efficient in tables.
- `F · Atkinson Hyperlegible Next`: accessibility-led character differentiation; widest and most distinctive at small sizes.
- `G · Barlow`: slightly rounded public-wayfinding character; approachable without becoming informal.

The specimen includes Argentine Spanish, long place names, identifiers, dates, times, statuses, and table numerals. The final font must be self-hosted; Google Fonts is used only to make this throwaway comparison trivial to run.

## Run

```bash
npm run prototype:typography
```

Open `http://localhost:3002/?type=A`. Use the floating arrows or keyboard left/right arrows to compare variants.

## What to decide

Judge legibility, scanability, civic tone, compact-table performance, and comfort on the mobile task card. Do not choose type scale, density, weights, spacing, or component styling from this prototype; those remain separate decisions.

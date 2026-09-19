# Spanish UX-writing prototype

Eighteenth focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

> Three Spanish interface voices, switchable via `?writing=`, applied to the same operational states.

## Decision isolated

Choose the project-wide Spanish voice and action-writing pattern. Layout, interaction, visual foundations, component anatomy, status terminology, and the approved motion system remain fixed so only language changes.

- `A · Directa rioplatense`: concise voseo, concrete verbs and objects, actionable errors, and calm acknowledgements.
- `B · Institucional clara`: formal `usted`-aligned verbs and more administrative phrasing. It feels official, but is longer and more distant in repeated tasks. **Approved.**
- `C · Acompañamiento contextual`: warmer language and additional explanation around every state. It helps unfamiliar users, but adds scanning cost and can feel over-supportive for daily operators.

## Resolution

**B · Institucional clara** was approved by the user on 2026-09-03. A and C remain comparison history rather than normative guidance.

## Run

```bash
npm run prototype:ux-writing
```

Open `http://localhost:3017/?writing=B`. Use the scenario tabs to compare validation, empty, destructive, permission, and success language; the floating arrows switch voice.

## What to decide

Compare comprehension on the first read, action clarity, consistency of terminology, tone under pressure, and whether the text remains useful for both Office and Field users. Do not choose individual sentences yet: choose the system that should govern future sentences.

<!--
Branch: tipo/XXX-descripcion-corta, created from `develop`. This PR targets `develop`.
Exceptions (hotfix/*) and branch protection: docs/agents/git-flow.md
-->

Closes #XXX

## What and why

<!-- The problem and the reason for this approach, not a list of files. -->

## Changes

-

## Evidence

<!--
Commands run and their result. UI changes: screenshots or a recording at desktop and at 760 px or less.
Docs-only changes: say that no application tests were run.
-->

## Checklist

- [ ] `npm run typecheck`, `npm run build`, `npm run lint` and `npm test` pass; `npm run test:e2e` too when this touches routes, session or navigation
- [ ] No conflicts with `develop`
- [ ] Docs updated if behavior, vocabulary, contracts or a decision changed: `CONTEXT.md`, `CONTRACTS.md`, `DESIGN.md`, `ROADMAP.md` or a record in `docs/adr/` (name the ADR if this contradicts one)
- [ ] Contract changes (Backend endpoints consumed, shared types): team notified, docs updated, backwards compatible where possible; Backend issue filed in `hllous/Backend-M6-DAPS2` if Backend needs to change
- [ ] User-facing copy is in Spanish and follows the "Spanish UX writing" section of `DESIGN.md`

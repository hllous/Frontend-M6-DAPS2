# Complex operational form prototype

Throwaway prototype for the Wayfinder ticket **Prototype a complex operational form and validate the UI seams**.

## Question

Which form architecture and primitives should M6 standardize on for a Crew Leader completing a ROUTE Service with exception evidence, unreliable connectivity, retryable uploads, and stale-server conflicts?

## Direction contract

- Mode: Operate.
- Visual authority: `PRODUCT.md` and `docs/design/inspiration/README.md`.
- Identity: pinned Navy `#0F2C59`, Coral `#D63031`, Inter, neutral ground and surfaces.
- Surface roll: seed `fab29dc1`; grounded structures dealt at indices 3, 4, and 6.
- Built structures: A dense zone matrix; B selected mix; C focused mobile step flow.
- Selected mix: B's zone-navigation workbench, A's descriptive result tags, and C's uninterrupted result-and-evidence form. On mobile the zone navigation collapses into a disclosure.
- Build path: code-first, as recorded in `.impeccable/config.json`.
- Shared architecture: one TanStack Form state, one Zod schema, Temporal timestamps, Radix interaction primitives, independent idempotent evidence uploads, explicit local drafts, and conflict recovery without last-write-wins.

The Navy/Coral palette is prototype scaffolding only. It is not the final visual-system decision; the Wayfinder ticket **Decide the visual system and DESIGN.md standard** owns the replacement palette and durable `DESIGN.md`.

Run `npm run dev`, then open `/prototype/route-completion-form?variant=B`. Use the floating arrows or `?variant=A` / `?variant=C` to revisit the source alternatives.

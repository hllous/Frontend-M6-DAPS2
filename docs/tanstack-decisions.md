# TanStack: shared tables and adjacent tools

Decision for #581 (parent #520), using installed `@tanstack/react-table` 9.3.1.

| Tool    | Decision                                                                     | Reason and revisit condition                                                                                                                                                                                                                                                                                |
| ------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Table   | Adopt for Services and the shared table; later domains migrate in #582–#585. | Sorting, visibility, ordering and sizing belong to one feature configuration. Panels provide data, column definitions and actions.                                                                                                                                                                          |
| Virtual | Defer everywhere in this extraction.                                         | Services currently renders 25 fixture records with variable row heights, sticky ordinals, selected-row scrolling and column drag animation. No measured rendering bottleneck justifies adding measurement, overscan and focus handling. Revisit with production row counts and a measured slow interaction. |
| Query   | Defer; any adoption needs a separate ticket.                                 | Fetching and mutations belong to existing workspace/BFF adapters, outside the table. Adding a cache here would introduce another owner for loading, errors and invalidation. Revisit when several consumers need the same remote data and coordinated invalidation.                                         |
| Form    | Defer; any adoption needs a separate ticket.                                 | Table migration does not change forms or their validation. Revisit a concrete complex form where field dependencies and validation lifecycle would remove existing state machinery.                                                                                                                         |

`useDataTable` supplies the shared TanStack instance; `DataTable` renders shadcn
Table primitives. Column visibility and resizing are disabled by default; callers
opt in through the hook. Ordering controls can use the same instance without
adding a toolbar to every table. Column definitions carry accessors, sorting rules,
cell renderers (including row actions) and size bounds.

Services keeps its existing header and row rendering through render overrides to
preserve filters, compact metadata and drag animation. Its workspace retains the
controlled ordering used by both map stops and table ordinals (`manualSorting`);
header interactions and announcements use the shared sorting affordance. Its
column controller uses the shared feature configuration and persistence hook,
retaining the existing per-user `m6:services-columns:v1` format and sanitization.
New tables can opt into `persistenceKey` to save sort, visibility, order and sizes.
Do not combine that option with externally controlled state for the same slices;
the owner of controlled state must persist it, as Services does.

The shadcn Table wrapper can omit its scroll container when a screen already owns
one. This keeps Services' scrolling, resize floor and sticky ordinal behavior.
The standard renderer and operational overrides retain the `table-*` data slots.

Sources read before implementation:

- Installed React adapter: `skills/getting-started/SKILL.md` and
  `skills/table-state/SKILL.md` under `node_modules/@tanstack/react-table/`.
- Installed core: `skills/core/SKILL.md` and the sorting reference under the
  `@tanstack/table-core` package's `skills/table-features/references/`.
- [shadcn Data Table guide](https://ui.shadcn.com/docs/components/base/data-table),
  which describes the v9 feature-based model and reusable column definitions.

Agent tooling: the installed packages bundle versioned TanStack Intent skills,
including React setup/state/migration and core feature references. The optional
`@tanstack/intent` CLI can list/load them; reading their installed files requires
no installation. shadcn CLI supports `info`, `view table` and `add table`; Data
Table is a guide, not an installable registry component. Official documentation
and local TypeScript declarations are available. This session has no configured
TanStack-specific MCP documentation server or TanStack-specific agent skill in
its external skill catalogue. No Query, Virtual or Form dependency was added.

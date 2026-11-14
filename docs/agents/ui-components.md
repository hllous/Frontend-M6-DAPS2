# UI components — detail

Skeleton lives in `AGENTS.md` (shadcn-first). This guide holds the rules that only matter when you touch overlays or the lint suppressions.

## Shared overlay paint rule

Applies to dialogs, sheets, drawers, popovers, dropdowns and tooltips:

- Keep translucent flat backdrops static, without backdrop blur.
- Animate panels with opacity and transform/translate only, and popups with opacity only.
- Keep shadows static.
- Scope `will-change` to an active transition.
- Disable overlay motion independently for reduced-motion users and detected software renderers.
- Keep resize work event-driven and out of per-frame layout loops.

## Suppression ownership

`eslint-suppressions.json` entries for raw tables belong to [#520](https://github.com/hllous/Frontend-M6-DAPS2/issues/520), and entries for loading states (skeletons) to [#525](https://github.com/hllous/Frontend-M6-DAPS2/issues/525). Leave them to those tickets rather than fixing them in unrelated work.

## Confirmation composition

[`ConfirmActionDialog`](../../src/components/ui/confirm-action-dialog.tsx) is the project composition for confirming a one-click write, specified in [#910](https://github.com/hllous/Frontend-M6-DAPS2/issues/910). It is built on the existing shadcn Dialog with Button, Alert and Spinner; `AlertDialog` is not installed.

- Pass the button as `trigger`. It renders through DialogTrigger, so it announces `aria-haspopup="dialog"` and gets focus back on Cancelar, Escape or the X. Pass `finalFocus` only when the trigger disappears after success.
- Copy follows one vocabulary: `title` names the action, `description` states the effect, `confirmLabel` is the verb, and the cancel button is always "Cancelar". Use `tone="destructive"` for irreversible or destructive actions. `notice` states an effect outside M6, such as a citizen notified through M2.
- `onConfirm` resolves to an error message (or throws) on failure; the dialog stays open with the error. While it runs, the confirm button keeps its label, shows a spinner, and the dialog cannot be closed or resubmitted.
- #910 extends confirmation beyond irreversible effects to Iniciar revisión, Autorizar intervención, Quitar integrante and Iniciar servicio outside its window. Iniciar servicio inside its window stays one tap ([ADR-0001](../adr/0001-no-offline-queue-for-field-service-actions.md)).
- A trigger that opens a controlled dialog without DialogTrigger declares `aria-haspopup="dialog"` itself.

## Location picker composition

[`LocationPickerDialog`](../../src/components/ui/location-picker-dialog.tsx) and [`LocationPicker`](../../src/components/ui/location-picker.tsx) are the custom composition approved by the PO in [#692](https://github.com/hllous/Frontend-M6-DAPS2/issues/692), implemented in [#694](https://github.com/hllous/Frontend-M6-DAPS2/issues/694). Controls use shadcn Button, Field and Input; the overlay uses Dialog. Leaflet has no shadcn equivalent and is dynamically imported without SSR, using the existing maps' OSM tiles, attribution and city center.

- Render `LocationPickerDialog` inside the parent dialog's content to preserve Base UI nested focus ownership. Pass `open`, `onOpenChange` and preferably a `trigger` element; its DialogTrigger restores focus after cancellation, Escape, close or confirmation. The overlay fills the mobile viewport and uses a large desktop dialog. Its CSS Module overrides only layout; shared overlay paint and reduced-motion rules still apply.
- Pass `currentPoint?: { lat, lng }` and `initialAddress?: string`. Each opening starts a fresh editing session with that point and address. Without a point, the city opens without a pin; GPS permission is requested only on pressing **Usar mi ubicación**.
- Inject `searchAddresses(query): Promise<Array<{ label, lat, lng }>>` from the caller's validated BFF adapter. Search runs on Enter or **Buscar dirección**. The picker owns the result list and error announcements, and never calls a geocoder directly.
- `onConfirm(point, selectedSearchLabel?)` returns coordinates rounded with `roundCoordinate` to seven decimals. A label accompanies a selected address result; moving the point by GPS, map tap or dragging clears that label. The caller may fill an empty address from it and must preserve typed text. Cancelling or closing never calls `onConfirm`.
- `locationPointLabel(point)` returns the operational zone name using the existing polygons, or **Fuera de las zonas operativas**. The notice never blocks confirmation. The caller can reuse it for the confirmed readout.
- Arrow keys pan the focused map; plus/minus zoom it with an ease-in-out animation, and a newly selected point glides there (pin, accuracy circle and map centre move together from the previous point; both disabled under `prefers-reduced-motion`). There is no crosshair: place the point by tap, drag, search or GPS. Point, search, GPS and tile failures have live announcements. GPS remains usable when tiles fail, and unsuccessful GPS leaves the point unchanged.

Focused tests: `pnpm test location-picker`. Leaflet is mocked at the component boundary; check real pan, zoom, tap, drag and nested focus in the running app using the [visual verification guide](visual-verification.md).

`LocationPicker` suggests as the user types (250 ms debounce, 3+ characters). Text without digits calls the optional `suggestStreets` prop (street names; picking one fills the field with `"<STREET> "` and focuses it); text with a digit calls `searchAddresses(query, { typeahead: true })` and lists addresses that place the pin on pick. The explicit **Buscar dirección** button keeps its own flow.

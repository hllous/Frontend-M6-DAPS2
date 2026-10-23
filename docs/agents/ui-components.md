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

## Location picker composition

[`LocationPickerDialog`](../../src/components/ui/location-picker-dialog.tsx) and [`LocationPicker`](../../src/components/ui/location-picker.tsx) are the custom composition approved by the PO in [#692](https://github.com/hllous/Frontend-M6-DAPS2/issues/692), implemented in [#694](https://github.com/hllous/Frontend-M6-DAPS2/issues/694). Controls use shadcn Button, Field and Input; the overlay uses Dialog. Leaflet has no shadcn equivalent and is dynamically imported without SSR, using the existing maps' OSM tiles, attribution and city center.

- Render `LocationPickerDialog` inside the parent dialog's content to preserve Base UI nested focus ownership. Pass `open`, `onOpenChange` and preferably a `trigger` element; its DialogTrigger restores focus after cancellation, Escape, close or confirmation. The overlay fills the mobile viewport and uses a large desktop dialog. Its CSS Module overrides only layout; shared overlay paint and reduced-motion rules still apply.
- Pass `currentPoint?: { lat, lng }` and `initialAddress?: string`. Each opening starts a fresh editing session with that point and address. Without a point, the city opens without a pin; GPS permission is requested only on pressing **Usar mi ubicación**.
- Inject `searchAddresses(query): Promise<Array<{ label, lat, lng }>>` from the caller's validated BFF adapter. Search runs on Enter or **Buscar dirección**. The picker owns the result list and error announcements, and never calls a geocoder directly.
- `onConfirm(point, selectedSearchLabel?)` returns coordinates rounded with `roundCoordinate` to seven decimals. A label accompanies a selected address result; moving the point by GPS, map tap, dragging or crosshair clears that label. The caller may fill an empty address from it and must preserve typed text. Cancelling or closing never calls `onConfirm`.
- `locationPointLabel(point)` returns the operational zone name using the existing polygons, or **Fuera de las zonas operativas**. The notice never blocks confirmation. The caller can reuse it for the confirmed readout.
- Arrow keys pan the focused map; plus/minus zoom it. **Marcar centro del mapa** marks the crosshair. Point, search, GPS and tile failures have live announcements. GPS remains usable when tiles fail, and unsuccessful GPS leaves the point unchanged.

Focused tests: `pnpm test location-picker`. Leaflet is mocked at the component boundary; check real pan, zoom, tap, drag and nested focus in the running app using the [visual verification guide](visual-verification.md).

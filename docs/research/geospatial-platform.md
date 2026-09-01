# Geospatial platform and provider constraints

Date: 2026-09-01  
Status: Wayfinder research for “Research geospatial platform and provider constraints”

## Decision summary

Use **MapLibre GL JS** as the browser renderer, but keep rendering, basemap tiles,
geocoding, routing, and application spatial data behind separate project-owned
interfaces. MapLibre renders sources; it does not provide map data, geocoding, or
routing. It is a TypeScript/WebGL renderer under the BSD 3-Clause license
([MapLibre documentation](https://maplibre.org/maplibre-gl-js/docs/),
[MapLibre license](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt)).

For the first production-shaped implementation:

- Use **IGN Argenmap Gris** as the default raster basemap, subject to a short
  availability, CORS, latency, mobile-legibility, and attribution prototype. It is
  the free official cartographic representation of Argentina, and IGN explicitly
  publishes TMS/XYZ endpoints for web viewers
  ([Argenmap overview](https://www.ign.gob.ar/odc-12-Ortiz),
  [IGN geoservices](https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/ServiciosOGC)).
  The grayscale style should keep operational layers visually dominant.
- Use **Georef v2** through an application adapter for Argentina address
  normalization, forward geocoding, reverse geocoding, and administrative units.
  It is an official, free API requiring no authentication; its data is periodically
  updated from official sources
  ([Georef overview](https://www.argentina.gob.ar/georef),
  [Georef FAQ](https://www.argentina.gob.ar/georef/georef-servicio-de-normalizacion-de-direcciones-y-unidades-territoriales-de-argentina-6)).
- Do not choose a routing service until the service-planning workflows establish
  whether the product needs only point-to-point directions, time/distance matrices,
  multi-stop ordering, or municipal-vehicle constraints. Treat routing as a
  backend-owned capability. **Self-hosted Valhalla** is the leading open candidate
  for the later prototype because it supports routes, matrices, isochrones, map
  matching, and tour optimization and is MIT-licensed
  ([Valhalla documentation](https://valhalla.github.io/valhalla/)). Its public demo
  endpoint is explicitly fair-use only and is not a production dependency.
- Keep a paid, MapLibre-compatible provider such as **MapTiler Cloud** as the
  operational fallback if Argenmap or self-hosted services cannot meet measured
  reliability, styling, or support needs. Do not adopt it by default: paid plans,
  attribution, direct-client request, proxy, caching, and offline restrictions must
  be accepted deliberately
  ([MapTiler pricing](https://www.maptiler.com/cloud/pricing/),
  [MapTiler Cloud terms](https://www.maptiler.com/terms/cloud/)).
- “Online-first with resilient drafts” remains the delivery assumption. Full
  offline maps and routing are a separate infrastructure/product decision, not a
  service-worker enhancement.

This is an architectural direction, not permission to depend directly on an
unversioned third-party response. Validate all provider responses at the boundary,
make endpoint/provider selection deploy-time configuration, and preserve the
ability to replace each provider without changing domain screens.

## Why the Argentina-first services lead

### Basemap: IGN Argenmap

IGN describes Argenmap as free, official Argentine cartography usable in web
applications. It publishes standard, grayscale, dark, topographic, and hybrid TMS
basemaps in EPSG:3857, plus WMTS, WMS, and WFS services. Its own integration example
requires attribution to IGN and OpenStreetMap and documents zoom levels 3–18
([IGN Leaflet example](https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/ServiciosOGC/Leaflet)).

MapLibre can consume a raster tile source with `scheme: "tms"`; the prototype must
translate IGN's Leaflet-style `{-y}` example into a MapLibre source rather than copy
the URL blindly. The repository must not encode the endpoint in domain components.

Research did **not** find an IGN-published SLA, quota, cache policy, offline grant,
or durable API version contract. “Free” does not establish those properties.
Therefore Argenmap is the preferred first provider, not an unqualified single point
of dependency. The prototype must record response headers, CORS behavior, latency,
error behavior, usable maximum zoom in the target municipality, and whether the
required attribution remains readable in the application layout.

### Search: Georef v2

Georef supports Argentina's provinces, departments, municipalities, governments,
localities, settlements, streets, directions, and reverse lookup. The `/direcciones`
resource accepts free-form Argentine addresses and benefits from province,
department, or locality constraints
([address normalization guide](https://www.argentina.gob.ar/georef/normalizacion-de-direcciones)).
It returns normalized address data and, when possible, estimated longitude and
latitude.

The same guide warns that geocoding effectiveness varies by region and that returned
coordinates are approximate. Consequently:

- restrict searches to the operator's municipality/administrative area;
- show ambiguous results rather than silently taking the first match;
- let the operator confirm or adjust the point on the map;
- retain the entered address, normalized address, coordinates, provenance, and
  confirmation state as distinct values;
- verify representative urban, peri-urban, informal, road-kilometre, intersection,
  and missing-street cases in the actual target municipality.

The public OSM Nominatim endpoint is not an acceptable autocomplete fallback. It
limits the whole application to one request per second, requires caching and
identification, forbids client-side autocomplete, disallows systematic queries, and
can withdraw access
([Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)).

## Routing and spatial data ownership

Routing answers must be reproducible business inputs, not transient presentation
effects. The frontend should request a route or matrix from its own backend contract;
the backend should apply vehicle/profile rules, protect provider credentials,
record provider/data-version provenance, enforce quotas, and make provider changes
without redeploying the client.

Valhalla is suitable for the later evaluation because its routing graph can be built
from OpenStreetMap data and supports driving, walking, cycling, matrices, isochrones,
map matching, and tour optimization. Argentina extracts are published in `.osm.pbf`
form and include update files
([Geofabrik Argentina extract](https://download.geofabrik.de/south-america/argentina.html)).
This path trades request fees and third-party exposure for infrastructure ownership:
graph builds, scheduled updates, monitoring, capacity planning, backups, and quality
validation become project responsibilities. OSM-derived routing data remains under
ODbL attribution/share-alike requirements
([OSM copyright and license](https://www.openstreetmap.org/copyright),
[Valhalla data sources](https://valhalla.github.io/valhalla/contributing/data/data-sources/)).

Before selecting or configuring routing, the domain work must answer:

- Is route order advisory or an authoritative plan that must be audited?
- Are crews cars, trucks, bicycles, pedestrians, or a mixture?
- Do height, weight, hazardous-material, road-class, turn, access, shift-time,
  capacity, service-duration, or depot constraints matter?
- Is live traffic required, or is a stable planning estimate preferable?
- Must operators manually override and explain a generated route?
- What is an acceptable stale-data window and failure fallback?

A generic shortest-path demo cannot resolve those questions.

Application-owned containers, trees, services, routes, reports, zones, and crew
locations must remain in the application's backend and database. Do not upload them
to a basemap vendor merely to display them. Serve small filtered viewports as GeoJSON;
move large or dense layers to authenticated vector tiles when measurement shows that
GeoJSON is no longer adequate.

## Licensing, cost, and provider boundaries

- **MapLibre GL JS:** BSD 3-Clause applies to the renderer. It does not license the
  map data displayed through it.
- **Argenmap:** IGN calls the service free and its example attributes IGN plus OSM.
  Preserve visible attribution. Confirm reuse, caching, printing/export, and support
  expectations with IGN before treating them as production guarantees.
- **OSM data:** ODbL requires credit and share-alike for adapted/distributed
  databases. Keep source and data-version provenance. A legal/license review is
  required before distributing derived data or offline packages.
- **OSMF public tiles:** do not use `tile.openstreetmap.org` as the production
  basemap. It is best-effort with no SLA, requires visible attribution and correct
  caching, prohibits bulk prefetch/offline use, and may block access without notice
  ([OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/)).
- **MapTiler Cloud fallback:** the currently published Flex plan starts at USD 25 per
  month and bills overage; the Unlimited plan starts at USD 295 per month and is the
  first listed plan with a 99.9% SLA. Prices exclude tax and can change, so deployment
  must use budgets and alerts rather than hard-coded cost assumptions. The terms
  allow temporary per-user device caching but generally require direct end-user
  requests, prohibit server-side proxy/cache and bulk downloads without a custom
  agreement, and require on-screen attribution. Full offline or a server-side proxy
  therefore requires a separate contract or on-prem/self-hosted data.

## Privacy and security constraints

Every direct tile request reveals at least the user's IP/referrer and the requested
tile coordinates, which approximate the viewed area. Search and routing requests can
reveal exact operational locations, addresses, crew movements, or planned work.
Therefore:

- never put JWTs, personnel data, internal entity IDs, or operational properties in
  tile/provider URLs;
- keep sensitive operational geometry on authenticated first-party endpoints;
- send only the minimum coordinates/query necessary to an approved external service;
- perform geocoding and routing through a first-party backend adapter unless a
  provider's terms require direct requests, in which case privacy review is a
  release gate;
- restrict browser-visible provider keys by allowed origin, API, and quota; keys in
  client code are identifiers, not secrets;
- log provider name, response status, latency, and quota use without logging raw
  addresses, route coordinates, or tokens;
- document retention and data-processing terms before enabling a paid provider.

OSMF explicitly says not to submit personal or confidential data to its public tile
or Nominatim services. This independently excludes those community endpoints from
sensitive operational flows.

## Accessibility and interaction constraints

The map may be a primary spatial view, but it cannot be the only way to understand or
operate a workflow. WCAG 2.2 requires text alternatives for non-text content,
keyboard-operable functionality, visible focus, non-text contrast, and information
that does not rely on color alone
([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).

Required design rules:

- synchronize every operational map with a semantic table/list containing the same
  selectable records, filters, status, and actions;
- selecting a row highlights and reveals its map feature, and selecting a feature
  focuses/announces the corresponding record without moving keyboard focus
  unexpectedly;
- provide address/coordinate fields and explicit controls for tasks otherwise done
  by clicking or dragging; geometry drawing needs keyboard-accessible alternatives
  or an assisted workflow;
- never encode service/report status by marker color alone; combine shape/icon,
  label, pattern, or text and meet non-text contrast requirements;
- keep attribution visible, controls named, focus visible, and popovers in a logical
  focus order; announce selection/count/loading/error changes with accessible status
  text;
- enable MapLibre's keyboard controls, which support pan, zoom, pitch, and rotation,
  but do not treat canvas navigation as a substitute for the accessible table
  ([MapLibre keyboard handler](https://maplibre.org/maplibre-gl-js/docs/API/classes/KeyboardHandler/));
- use cooperative gestures or disable scroll zoom where an embedded map would trap
  page scrolling, and honor reduced motion for camera transitions.

Automated accessibility checks cannot validate the spatial equivalence. Keyboard,
screen-reader, high-zoom, contrast, touch, and no-WebGL/manual fallback checks belong
in acceptance testing.

## Performance, CSP, caching, and offline

### Performance budgets and data shape

Start with filtered, viewport- or area-scoped GeoJSON and measure on the lowest
supported field device/network. Define acceptance thresholds in the map prototype
for initial usable map time, interaction responsiveness, memory, transfer size,
feature count, and table/map synchronization.

MapLibre recommends removing unused properties, reducing unnecessary coordinate
precision, simplifying geometry, compressing/chunking or streaming data, clustering
points, limiting layers/zoom ranges, and moving large datasets to vector tiles
([large-data guide](https://maplibre.org/maplibre-gl-js/docs/guides/large-data/)).
Use stable feature IDs and incremental `updateData` for frequent changes. Do not send
all municipal history to the browser because a GPU renderer can technically draw it.

### CSP and Next.js integration

Self-host the MapLibre worker and CSS from pinned dependencies. Current MapLibre
documentation identifies a Next.js/Turbopack constraint: both
`maplibre-gl-worker.mjs` and `maplibre-gl-shared.mjs` must be copied together and the
worker URL set explicitly. A same-origin worker permits the documented baseline
`worker-src 'self'` and avoids adding `blob:`; MapLibre also requires
`img-src data: blob: 'self'`
([MapLibre installation and CSP](https://maplibre.org/maplibre-gl-js/docs/)). Add only
the selected tile/provider origins to `connect-src` and `img-src`; do not allow broad
wildcards. Verify production headers, worker loading, fonts/sprites, raster tiles,
and error reporting in an end-to-end CSP test.

### Cache and offline boundary

Normal HTTP/browser caching should honor provider response headers. A service worker
must not indiscriminately cache or prefetch third-party tiles. OSMF expressly forbids
offline/prefetch against its public tile service, while MapTiler Cloud only permits a
temporary single-user device cache under standard terms. IGN publishes no offline
grant found in this research.

Full offline support would require all of the following as a separate decision:

- data/provider rights that explicitly permit regional packaging;
- bounded area and zoom-level packages with quota/storage budgets;
- first-party versioning, expiry, update, integrity, and eviction rules;
- offline geocoding/routing or explicit degraded behavior;
- conflict/synchronization design for operational edits;
- device-loss and sensitive-location protections.

Until that decision is made, cache the application shell and drafts where permitted,
show clear map/search/route unavailable states, preserve entered work, and keep the
table usable with already-loaded first-party records.

## Required follow-up prototypes and acceptance evidence

1. **Argenmap + MapLibre spike:** verify TMS Y-axis configuration, CORS, actual zoom
   coverage, attribution, grayscale legibility, WebGL/no-WebGL behavior, Next.js
   worker packaging, and strict CSP in local/preview builds.
2. **Georef quality sample:** test a curated set from the real municipality and
   record exact, approximate, ambiguous, and failed matches. Decide confirmation UX
   from evidence.
3. **Accessible map/table workflow:** test bidirectional selection, filters, marker
   clusters, keyboard-only operation, a screen reader, 400% zoom/reflow, touch, and
   reduced motion.
4. **Scale test:** use realistic counts and geometry complexity for containers,
   trees, services, zones, and reports; record when to graduate from GeoJSON to
   authenticated vector tiles.
5. **Routing discovery/prototype:** only after vehicle, constraint, audit, freshness,
   and override requirements are known; compare self-hosted Valhalla with an approved
   managed provider using representative routes in the target municipality.
6. **Provider failure drill:** demonstrate that basemap, geocoding, and routing
   failures are isolated; tables/forms and saved drafts must remain usable.

The provider decision can be promoted beyond this baseline only after these results
and the production owner's SLA, budget, privacy, and offline requirements are known.

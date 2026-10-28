# M6 owns a server-side BFF session; the M1 JWT never reaches the browser

M1 has now published v2 authentication endpoints and confirmed that it emits the user JWT. It still has not published an OAuth2/OIDC-compatible contract: no JWKS or other verification-key distribution, JWT algorithm, issuer/audience, claims shape, exact lifetimes, or refresh-token rotation/revocation behavior. That still rules out adopting Better Auth today. The frontend deploys to Vercel's free serverless tier with no Redis or session store available.

**Implementation status (2026-09-30):** the frontend currently supports `mock` and `backend-development` sessions. `real-m1` deliberately fails closed; there is no M1 login, refresh, or logout integration yet. The `m6_session` cookie is encrypted by the current code with AES-256-GCM using `M6_SESSION_SECRET`; it is a custom sealed-cookie format, not a standards-compliant compact JWE. This note distinguishes the shipped session boundary from the M1 flow selected below.

We chose a Next.js BFF with M6 Backend as its sole module-facing gateway: the browser only talks to Next.js; the BFF calls M6 Backend; and M6 Backend owns the server-to-server adapter to M1 for login (refresh: the BFF calls `POST /auth/refresh` itself, see the 2026-10-27 note), while independently validating the M1 JWT for domain requests. The target session lives in a sealed, `httpOnly`, `Secure`, `SameSite` cookie holding the original M1 JWT, normalized claims, derived Capabilities, and a `capabilityPolicyVersion` marker (see [ADR-0005](0005-m6-backend-is-the-sole-authorization-authority.md)) — the browser's JavaScript never touches the raw token, and no server-side session store is required. The current mock/development session does not contain M1 claims. CSRF protection relies on `SameSite` plus Next.js's native Origin/Host check on Server Actions; any mutating Route Handler outside that path additionally requires a JSON body and a custom header, neither of which a plain HTML form can produce.

Expiry is `effectiveExpiry = min(jwt.exp, idleExpiry, absoluteExpiry)`: resealing the cookie on activity can extend the idle/absolute windows but never `jwt.exp` itself. M1 now declares a refresh endpoint, so the M1 adapter may atomically replace the access/refresh token before access-token expiry once the exact refresh request and rotation contract are verified; it must never simulate a refresh by only extending the M6 cookie. If M1 rejects the refresh (400/401/403), or the token is expired, the BFF clears the session and requires login. Route protection is layered: Next.js middleware is an optimistic UX gate only (redirects on a missing/invalid cookie), while the actual authorization check repeats at every Server Action, Route Handler, and data-access call, with M6 Backend as the final authority — nothing relies on middleware or layouts alone for security. Logout clears the session cookie first and broadcasts the event across every open tab via `BroadcastChannel`; M1 has no logout (Catalog v3.0, 2026-10-27: only `refresh` remained), so signing out only discards the sealed cookie that holds the tokens; M1 is not called. Without a session store there is no M6-side forced revocation or proactive expiry detection in another open tab; that tab notices on its next request.

**Note (2026-10-27, #712):** M1 confirmed `refresh` stays and logout no longer exists. The BFF renews tokens in `src/lib/m1-refresh.ts`, through `POST {M1_BASE_URL}/auth/refresh`: preventively when the access token has 60 s or less left, and once after a 401 from M6. It replaces the access and refresh token in the sealed cookie and sends M6 only the access token. Only sessions marked `source: "m1"` that carry a refresh token renew, so the `M6_DEV_JWT` path never does; no such session is created yet (the M1 login stays closed, #145). The refresh request/response shape is not defined by the contract and is **unverified against M1** (assumed: `X-Refresh-Token` in, `Authorization`/`X-Refresh-Token` headers or a JSON body out). A 400/401/403 from M1 ends the session; any other failure (5xx, 404, 408, 429, network) never logs anyone out.

Known limits of this design:

- **Activity window.** Renewal only happens when a request (or the `/api/session` activity pulse) reaches the BFF within the last 60 s of the access token's 15 min. An access token that already expired makes the session inactive before a refresh can be attempted, so the user goes back to login.
- **Per-instance memo.** Concurrent renewals with the same refresh token share one M1 call for 10 s (5 s for failures), but only inside one server instance. On serverless, two instances can still race, which matters if M1 rotates refresh tokens.
- **Logout is not revocation (known risk, pending a PO decision).** M1 has no logout and keeps no denylist. Signing out only deletes the cookie in the browser. A copied cookie can keep renewing, chained, until `absoluteExpiresAt` (8 h after login), and the refresh token it holds stays valid in M1 for up to 7 days. No constant was changed; shortening the absolute window or asking M1 for revocation is for the PO to decide.

**Note (2026-09-30):** M6 Backend's deployed JWT verification is still a stopgap, not this ADR's target — HS256 against `JWT_SECRET`, with a required `sub` and `exp` and optional `roles: string[]`; no domain `@Roles()` enforcement is in use. Anyone wiring the BFF to this backend before M1 publishes its contract needs a token in that shape, signed with the shared secret — not an M1 token. **M1 remains the intended source of the user JWT**; the stopgap is expected to be replaced, not treated as a second target contract.

Considered Options:
- Adopt Better Auth now against a best-guess OIDC configuration — rejected: there is no discoverable OIDC/OAuth2 metadata to configure against, and it would mean building against a protocol M1 has never committed to.
- Keep the raw JWT reachable from browser JavaScript (e.g. `localStorage`) so the client attaches it itself — rejected: an unnecessary XSS exposure once a BFF exists to hold the token server-side instead.
- Stand up Redis now for a stateful, revocable session store — rejected as premature infrastructure for a Vercel free-tier deployment; deferred until a real M1 contract demands revocation or refresh semantics a stateless sealed cookie can't provide.

## Diagram

Request path for a domain call. The M1 JWT only exists inside the sealed cookie and the server-side hops.

```mermaid
flowchart LR
    B[Browser] -->|"m6_session cookie (sealed, httpOnly)"| R[Next Route Handler / BFF]
    R -->|"unseals cookie, adds Authorization: Bearer M1 JWT"| API[M6 Backend]
    API -->|"verifies the JWT, final authorization"| R
    R -->|"JSON only, no token"| B
    API -.->|"login (server to server)"| M1[M1]
    R -.->|"POST /auth/refresh (BFF, no logout)"| M1
```

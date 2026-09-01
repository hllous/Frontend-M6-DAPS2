# M1 identity and JWT integration contract research

**Research date:** 2026-09-01  
**Wayfinder ticket:** [Investigate the M1 identity and JWT integration contract](https://github.com/hllous/Frontend-M6-DAPS2/issues/17)  
**Status:** The ownership boundary is confirmed; the consumable identity contract is not published.

## Executive finding

The planning source of truth confirms that **M1 issues the JWT and owns users and organizations**. M6 must not create a competing identity or `Organization` model. It also explicitly records that M1's claim set and token-validation contract are unresolved ([Wayfinder map](https://github.com/hllous/Frontend-M6-DAPS2/issues/6)).

No accessible, first-party M1 repository, OpenAPI document, OAuth/OIDC metadata document, JWKS, or identity integration guide could be found during this research. The accessible M6 sources contain only consumer expectations and placeholders. They do not establish M1's login endpoint, token contents, signing keys, refresh or logout behavior, or user/organization lookup API.

Therefore:

- M6 can plan around an identity-provider seam, protected routes, and capability checks.
- M6 cannot yet choose Better Auth as the M1 adapter, implement JWT verification, define session lifetime, or finalize authorization claims without inventing a protocol.
- Authentication and authorization implementation remains blocked until M1 publishes the minimum contract listed below.

## Confirmed facts

| Area | Confirmed fact | Authority and limit |
|---|---|---|
| Ownership | M1 issues the JWT and owns users and organizations. M6 does not issue a competing identity or create another `Organization` concept. | Canonical planning decision in the [Wayfinder map](https://github.com/hllous/Frontend-M6-DAPS2/issues/6). This fixes ownership, not protocol details. |
| M6 references | `Crew.organizationId`, `leaderUserId`, and `memberUserIds` are external identifiers; an M1 organization lookup is needed to display cooperative details. | M6 domain source: [`configuracion-y-recursos.md`](https://github.com/hllous/Backend-M6-DAPS2/blob/55ed92f6bab64de38ff10c3c5904e02162f43929/docs/entidades/configuracion-y-recursos.md#L38-L47). |
| Lookup status | M6 expects citizen-by-`citizenId` and organization-by-`organizationId` REST queries, but both remain unconfirmed. M6 and M1 exchange no domain events for these lookups. | M6 integration source: [`bloqueantes.md`](https://github.com/hllous/Backend-M6-DAPS2/blob/55ed92f6bab64de38ff10c3c5904e02162f43929/docs/bloqueantes.md#L30-L33) and [`Acuerdo-Eventos-M6.md`](https://github.com/hllous/Backend-M6-DAPS2/blob/55ed92f6bab64de38ff10c3c5904e02162f43929/docs/Acuerdo-Eventos-M6.md#L291-L304). This is a consumer request, not an M1 contract. |
| M6 API posture | M6 intends authenticated endpoints to accept an HTTP Bearer JWT. Its documentation convention distinguishes `401` for a missing/invalid token and `403` for insufficient role access. | M6-side convention in [`estandar-swagger.md`](https://github.com/hllous/Backend-M6-DAPS2/blob/55ed92f6bab64de38ff10c3c5904e02162f43929/docs/api/estandar-swagger.md#L23-L38) and its [endpoint rules](https://github.com/hllous/Backend-M6-DAPS2/blob/55ed92f6bab64de38ff10c3c5904e02162f43929/docs/api/estandar-swagger.md#L100-L142). This does not prove how M1 delivers a token to a browser. |
| Authorization implementation | The current M6 `RolesGuard` assumes `user.roles: string[]`; its own comment identifies that shape as temporary and dependent on the missing claim set. | M6 placeholder: [`roles.guard.ts`](https://github.com/hllous/Backend-M6-DAPS2/blob/55ed92f6bab64de38ff10c3c5904e02162f43929/src/common/guards/roles.guard.ts#L5-L27). It is not a confirmed M1 claim. |

## Source conflict that must not become a contract

The pinned Backend M6 revision still attributes JWT issuance to M9 in Swagger and configures a local shared-secret/expiration placeholder ([Swagger configuration](https://github.com/hllous/Backend-M6-DAPS2/blob/55ed92f6bab64de38ff10c3c5904e02162f43929/src/main.ts#L43-L51), [environment placeholder](https://github.com/hllous/Backend-M6-DAPS2/blob/55ed92f6bab64de38ff10c3c5904e02162f43929/src/config/env.validation.ts#L9-L14)). Its domain documentation also says user identity was unresolved between M9 and M1 ([resource model](https://github.com/hllous/Backend-M6-DAPS2/blob/55ed92f6bab64de38ff10c3c5904e02162f43929/docs/entidades/configuracion-y-recursos.md#L43-L49)).

Those statements predate and conflict with the canonical Wayfinder decision that M1 is the issuer and identity owner. Treat them as stale documentation/placeholders, not evidence for M9 issuance, HS256, a shared `JWT_SECRET`, a one-hour lifetime, or a `roles` array. The Backend source and frontend mirror need to converge on M1 while retaining an explicit "contract pending" warning.

## Contract gaps

Nothing in the accessible first-party material confirms the following:

### Login and browser session

- Login/authorization endpoint, HTTP method, request/response shape, and supported credential or SSO flow.
- Whether M1 implements OAuth 2.0, OpenID Connect, or a proprietary login API.
- Whether the browser talks to M1 directly, redirects to M1, or only talks through an M6 backend/BFF.
- Allowed origins, redirect URIs, CORS behavior, cookie attributes, and CSRF requirements.
- Whether an ID token exists separately from the access token.

### Access-token validation

- Exact token type/profile and whether the token is signed JWS, encrypted JWE, or opaque.
- `iss`, permitted `aud`, required `sub`, `exp`, `nbf`, `iat`, and `jti` behavior.
- Signing algorithm allow-list, key identifiers, public-key/JWKS URL, key rotation/cache policy, or introspection endpoint.
- Clock-skew tolerance and behavior for expired, not-yet-valid, malformed, wrongly issued, wrongly addressed, or revoked tokens.

JWT itself does not make these claims mandatory: RFC 7519 says each application must define which claims it requires ([RFC 7519, sections 4 and 4.1](https://www.rfc-editor.org/rfc/rfc7519.html#section-4)). They cannot safely be inferred from the word "JWT".

### Identity and authorization claims

- Stable user identifier and its relationship to M6's `leaderUserId`, `memberUserIds`, `inspectorId`, and audit-user fields.
- User display/profile claims versus a separate user lookup endpoint.
- Roles, permissions/scopes, capability vocabulary, and whether these are global, organization-scoped, or M6-scoped.
- Organization memberships, active organization selection, organization identifier, and multi-organization behavior.
- Account-disabled, membership-removed, and permission-change propagation or revocation behavior.

### Lifecycle

- Access-token lifetime and idle/absolute session limits.
- Refresh-token existence, storage, rotation, reuse detection, expiry, and failure behavior.
- Logout endpoint and whether logout terminates only the local M6 session or the M1 session too.
- Revocation, introspection, back-channel/front-channel logout, or other invalidation mechanism.

### M1 lookups and failures

- User/citizen lookup and organization lookup paths, schemas, authorization, pagination, filtering, and not-found/privacy semantics.
- Error envelope and status codes for bad credentials, locked/disabled users, expired credentials, throttling, unavailable M1, and validation-key failure.
- Environment base URLs, service authentication for M6-backend-to-M1 calls, timeouts, retry rules, and rate limits.

## Minimum contract to request from M1

M1 should publish one versioned package containing:

1. **Protocol declaration:** OAuth/OIDC discovery URL if supported, otherwise an OpenAPI contract for login, refresh, logout/revocation, user lookup, and organization lookup.
2. **Access-token profile:** token kind, exact issuer and audiences, required/optional claims with types and examples, algorithm allow-list, header requirements (`typ`, `kid`), and lifetime/skew rules.
3. **Verification mechanism:** `jwks_uri` and rotation/cache expectations, or introspection endpoint and M6 service credentials. Do not distribute an undocumented shared secret.
4. **Authorization vocabulary:** stable subject/user ID, roles/scopes/capabilities, organization membership and active-organization semantics, and change/revocation propagation.
5. **Session lifecycle:** login flow, refresh rotation, absolute/idle expiry, logout scope, revocation, disabled-account behavior, and concurrent-session policy.
6. **Browser/backend boundary:** redirect URIs, trusted origins, CORS, cookies and SameSite/Secure/HttpOnly rules, CSRF protection, and whether tokens may ever be exposed to browser JavaScript.
7. **Failure contract:** status codes and machine-readable errors for every login, token, refresh, authorization, lookup, throttling, and availability failure.
8. **Test evidence:** non-production issuer/base URLs, public test keys or introspection access, sanitized token examples, example error responses, and test users covering each role/organization state.

If M1 supports authorization-server metadata, RFC 8414 defines discoverable fields such as `issuer`, authorization/token endpoints, `jwks_uri`, revocation, introspection, and supported signing algorithms ([RFC 8414, section 2](https://www.rfc-editor.org/rfc/rfc8414.html#section-2)). If it supports OpenID Connect, its discovery document has a standardized location and metadata shape ([OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfig)). These are conditional paths, not claims that M1 already supports either standard.

## Security constraints for the later integration decision

Whichever protocol M1 publishes, M6 validation must:

- pin permitted algorithms instead of trusting the token's `alg` header;
- validate issuer and audience against configured values;
- validate cryptographic integrity and applicable time claims;
- keep validation rules for different token kinds mutually exclusive;
- reject a token when required claims are missing or malformed.

These constraints follow the JWT Best Current Practices requirements on algorithm verification, issuer/audience validation, and cross-JWT confusion ([RFC 8725, sections 3.1, 3.8, 3.9, and 3.12](https://www.rfc-editor.org/rfc/rfc8725.html#section-3)).

For API transport, the only currently compatible M6 convention is `Authorization: Bearer <token>`. RFC 6750 standardizes that header and the `WWW-Authenticate` response mechanism for bearer-token failures ([RFC 6750, sections 2.1 and 3](https://www.rfc-editor.org/rfc/rfc6750.html#section-2.1)). Query-string tokens must not be introduced.

Refresh, revocation, and single-sign-out must remain undecided until M1 declares a protocol. OAuth token revocation has a defined endpoint and semantics only when the authorization server implements RFC 7009 ([RFC 7009](https://www.rfc-editor.org/rfc/rfc7009.html)); OpenID Connect RP-initiated logout likewise depends on provider metadata and an `end_session_endpoint` ([OpenID Connect RP-Initiated Logout 1.0](https://openid.net/specs/openid-connect-rpinitiated-1_0.html#RPLogout)).

## Planning consequence

The later authentication/session decision should branch on evidence:

- **If M1 publishes compatible OAuth 2.0/OpenID Connect metadata and flows:** evaluate Better Auth only as an M1-facing session adapter/BFF. M1 remains issuer and identity source.
- **If M1 publishes a proprietary JWT login API:** plan an owned server-side M6 session/BFF adapter that keeps the upstream token out of browser JavaScript and translates M1 lifecycle failures into the internal UI session model.
- **If M1 publishes neither verification keys nor introspection:** M6 cannot securely accept M1 JWTs; this is a hard integration blocker, not a reason to share an assumed secret or decode claims without verification.

Until one branch is evidenced, fixtures may model only an explicitly hypothetical `AuthenticatedPrincipal` interface. Fixture roles, claims, expiries, refresh behavior, and organization membership must be visibly marked as hypotheses and must not be presented as M1 contracts.

## Research scope and method

Sources were limited to primary standards, the canonical Frontend Wayfinder issue, first-party M6 repository documentation/source pinned at commit `55ed92f6bab64de38ff10c3c5904e02162f43929`, accessible repositories owned by `hllous`, and exact GitHub code/repository searches for the known M1 vocabulary. Search results exposed M6 and counterpart assumptions but no discoverable M1-owned repository or contract. This is a bounded finding about accessible sources on 2026-09-01, not proof that no private or unshared M1 artifact exists.

# Frontend security controls are defense in depth; Backend must validate and audit authoritatively

Evidence uploads and exports touch Tier 2 data (see the `Sensitivity Tier` term in `CONTEXT.md`) — a citizen's identity, inspector findings, violation and sanction details. Backend now exposes `/evidence`, but the current implementation checks the declared MIME value and file size only. It does not inspect magic bytes, remove image metadata, or scan for malware; Tier 2 read auditing and server-side export allowlists are also not implemented. This decision extends the posture in [ADR-0005](0005-m6-backend-is-the-sole-authorization-authority.md): the frontend must not stand in as an authoritative security gate, and Backend must provide those controls before production sign-off.

Concretely: the frontend restricts file selection by declared type and size for usability; it does not re-encode image bytes or remove EXIF. Those client checks can be bypassed and do not validate file contents. Any future export must enforce its field allowlist server-side, not merely hide UI columns. The frontend records a small allowlisted set of authentication and request events through `src/lib/telemetry.ts`; today that function writes to the server console and has no observability pipeline destination. This signal is not an audit log and carries no JWT, PII, or form content.

**Implementation status (2026-09-30):** Backend issue #90 remains a production gate. `POST /evidence` accepts JPEG, PNG, WebP, and PDF according to the declared MIME value, enforces the 10 MB limit, and stores the bytes unchanged. The frontend's checks are UX safeguards only.

Considered Options:
- Let the frontend be the only gate on upload content and export fields — rejected: identical failure mode to trusting frontend-embedded Capabilities as authoritative (ADR-0005); a client-side-only gate becomes an actual bypass when anything calls the API directly.
- Have the frontend maintain its own audit log to cover the gap — rejected: an audit-of-record duplicated across two systems drifts, and Backend already receives the authenticated actor's identity on every request, so it's the natural single owner.

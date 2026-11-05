---
name: hidden-user-skills
description: "Slash skills the user types (/wait-what, /grill-with-docs, /to-spec…) may live in ~/.claude/skills without showing in the Skill listing; read their SKILL.md"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0024bf41-97c5-419d-ac30-b70535fbe679
  modified: 2026-10-30T23:09:53.566Z
---

When the user types a `/skill` that is not in the Skill tool's listing, look in `~/.claude/skills/<name>/SKILL.md` before saying it doesn't exist; follow it by hand. Examples: `wait-what` (re-pitch in ASD-STE100 Simplified Technical English using GLOSSARY.md terms), `grill-with-docs` (= `grilling` + `domain-modeling`), `to-spec`, `to-tickets`.

**Why:** On 2026-10-30 I told the user `/wait-what` didn't exist; it did, as a `disable-model-invocation` user skill. Same mistake as in [[to-spec-every-issue]].

**How to apply:** `ls ~/.claude/skills` first; never claim a skill is missing without checking.

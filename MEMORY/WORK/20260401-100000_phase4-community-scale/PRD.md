---
task: Implement Phase 4 community library sharing moderation export
slug: 20260401-100000_phase4-community-scale
effort: advanced
phase: build
progress: 0/26
mode: interactive
started: 2026-04-01T10:00:00+02:00
updated: 2026-04-01T10:01:00+02:00
---

## Context

Phase 4 of Grok Voice Roleplay Platform. Phases 1-3 complete. Characters, personas, scenarios, multi-character sessions, LTM, auto-chaining all working. Now adding community features, sharing, moderation, and export.

## Criteria

- [ ] ISC-1: Public library page at /library with tabs for characters and scenarios
- [ ] ISC-2: Library shows only public items from all users
- [ ] ISC-3: Library search by name/title
- [ ] ISC-4: Library filter by tags
- [ ] ISC-5: Library filter by content rating (SFW/mature)
- [ ] ISC-6: Library character cards show creator name
- [ ] ISC-7: "Use This Character" button clones a public character to user's library
- [ ] ISC-8: "Use This Scenario" button clones a public scenario to user's library
- [ ] ISC-9: Session sharing: generate shareable URL for a session transcript
- [ ] ISC-10: Shared session page at /shared/[id] (public, no auth required)
- [ ] ISC-11: Shared session displays transcript read-only with character names
- [ ] ISC-12: Share button on session page generates link
- [ ] ISC-13: Export character as JSON from character detail page
- [ ] ISC-14: Export persona as JSON from persona detail page
- [ ] ISC-15: Export all memories as JSON from memory browser
- [ ] ISC-16: Import character from JSON file
- [ ] ISC-17: Import persona from JSON file
- [ ] ISC-18: Content moderation toggle per character (SFW/mature)
- [ ] ISC-19: User setting for content rating filter (hide mature by default)
- [ ] ISC-20: Rate limiting middleware (max sessions per hour)
- [ ] ISC-21: Session replay page shows transcript with timestamps
- [ ] ISC-22: Nav sidebar includes Library link
- [ ] ISC-23: Supabase shared_sessions table for sharing
- [ ] ISC-24: RLS policy allows public read on shared sessions
- [ ] ISC-25: Clone action preserves all character fields except owner_id
- [ ] ISC-26: Build compiles with zero TypeScript errors

## Decisions

## Verification

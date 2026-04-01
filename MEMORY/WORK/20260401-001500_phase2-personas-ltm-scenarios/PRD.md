---
task: Implement Phase 2 personas LTM voice confirm scenarios
slug: 20260401-001500_phase2-personas-ltm-scenarios
effort: advanced
phase: observe
progress: 0/28
mode: interactive
started: 2026-04-01T00:15:00+02:00
updated: 2026-04-01T00:15:30+02:00
---

## Context

Phase 2 of the Grok Voice Roleplay Platform. Phase 1 (MVP) is complete and working: auth, character CRUD, voice sessions via xAI Realtime API, text input, STM compression. Database tables for Phase 2 features already exist (personas, scenarios, memory_ltm, advanced_prompt_presets).

### Risks
- OpenAI embedding API needed for LTM (text-embedding-3-small), requires OPENAI_API_KEY
- Memory write on session end needs reliable trigger (user might close browser)
- pgvector cosine similarity threshold tuning (0.75 may be too strict or too loose)

## Criteria

- [x] ISC-1: Persona create page exists at /personas/new
- [ ] ISC-2: Persona edit page exists at /personas/[id]/edit
- [ ] ISC-3: Persona list page exists at /personas
- [ ] ISC-4: Persona server actions (create, update, delete) work
- [ ] ISC-5: Persona selector available when starting a session
- [ ] ISC-6: Persona name injected into context envelope as {{user}}
- [ ] ISC-7: Persona description injected into context envelope
- [ ] ISC-8: Scenario create page exists at /scenarios/new
- [ ] ISC-9: Scenario list page exists at /scenarios
- [ ] ISC-10: Scenario server actions (create, update, delete) work
- [ ] ISC-11: Scenario selectable when starting a session
- [ ] ISC-12: Scenario description injected into context envelope
- [ ] ISC-13: Embedding function generates vectors via text-embedding-3-small
- [ ] ISC-14: LTM write on session end (auto-summarize transcript to memories)
- [ ] ISC-15: LTM write periodic (every 10 turns, extract key facts)
- [ ] ISC-16: LTM manual pin (user can flag a turn as memorable)
- [ ] ISC-17: LTM retrieval via match_memories before context assembly
- [ ] ISC-18: LTM results injected into context envelope
- [ ] ISC-19: Memory browser page at /memories
- [ ] ISC-20: Memory browser shows entries grouped by character
- [ ] ISC-21: Memory entries deletable by user
- [ ] ISC-22: Nav sidebar includes Personas, Scenarios, Memories links
- [ ] ISC-23: Start session flow includes persona picker
- [ ] ISC-24: Start session flow includes scenario picker (optional)
- [ ] ISC-25: Session end triggers LTM write
- [ ] ISC-26: Turns table tracks turn count for periodic LTM trigger
- [ ] ISC-27: OPENAI_API_KEY added to .env.local
- [ ] ISC-28: Build compiles with zero TypeScript errors

## Decisions

## Verification

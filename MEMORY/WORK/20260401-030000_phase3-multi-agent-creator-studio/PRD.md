---
task: Implement Phase 3 multi-agent advanced prompts creator studio
slug: 20260401-030000_phase3-multi-agent-creator-studio
effort: advanced
phase: build
progress: 0/26
mode: interactive
started: 2026-04-01T03:00:00+02:00
updated: 2026-04-01T03:01:00+02:00
---

## Context

Phase 3 of Grok Voice Roleplay Platform. Phases 1-2 complete: auth, character/persona/scenario CRUD, single-character voice sessions, LTM, STM compression, Quick Import.

Phase 3 adds: multi-character sessions, turn routing, advanced prompt presets, scenario cast picker, voice audition, memory browser search.

## Criteria

- [ ] ISC-1: Scenario form has character cast picker (select multiple characters)
- [ ] ISC-2: Scenario default_cast saved to database
- [ ] ISC-3: Start session form shows scenario's default cast when scenario selected
- [ ] ISC-4: Session can have multiple active_character_ids
- [ ] ISC-5: Session page shows which character is currently speaking
- [ ] ISC-6: Turn routing logic exists (name addressing, round-robin, last speaker)
- [ ] ISC-7: Each character uses its own voice_id in the WebSocket session
- [ ] ISC-8: Character switch sends new session.update with different voice+personality
- [ ] ISC-9: Session transcript shows character name per assistant message
- [ ] ISC-10: Advanced prompt presets CRUD (list, create, edit, delete)
- [ ] ISC-11: Advanced prompt presets selectable in start session form
- [ ] ISC-12: Advanced prompt injected into context envelope
- [ ] ISC-13: Voice audition button on character form (play sample TTS)
- [ ] ISC-14: Scenario detail shows cast characters
- [ ] ISC-15: Memory browser has text search
- [ ] ISC-16: Memory browser filterable by character
- [ ] ISC-17: Multi-character session UI shows character avatars/names
- [ ] ISC-18: Turn routing handles "talk to [name]" detection
- [ ] ISC-19: Context envelope includes other characters present
- [ ] ISC-20: Nav sidebar includes Advanced Prompts link
- [ ] ISC-21: Advanced prompt presets page at /prompts
- [ ] ISC-22: Advanced prompt preset form with directives
- [ ] ISC-23: Session header shows all active characters
- [ ] ISC-24: Narrator voice for scene-setting text (separate neutral profile)
- [ ] ISC-25: Multi-character context includes awareness of other NPCs
- [ ] ISC-26: Build compiles with zero TypeScript errors

## Decisions

## Verification

---
task: Plan Grok voice roleplay agent platform build
slug: 20260331-191500_grok-voice-roleplay-platform
effort: deep
phase: build
progress: 45/48
mode: interactive
started: 2026-03-31T19:15:00+02:00
updated: 2026-03-31T19:16:00+02:00
---

## Context

Sverre wants to build a multi-agent roleplay platform powered by Grok voice for immersive interactive fiction. Users create characters with distinct voice profiles, build scenarios, play as personas, and interact via voice or text. The system includes short-term and long-term memory across sessions.

Inspired by JanitorAI.com but built on production-grade infrastructure: Grok TTS/STT, Supabase + pgvector, LiveKit audio transport, Next.js 15 frontend.

### Existing Assets
- GrokVoice skill (`~/.claude/skills/GrokVoice/`) with WebSocket client, audio pipeline, token management
- GrokVoice web interface (Next.js 15, React 19, Tailwind, shadcn/ui) with useVoiceAgent hook
- Supabase + pgvector pattern in second-brain project (OpenBrain)
- Agent composition system with traits-based approach (`~/.claude/skills/Agents/`)
- VoiceServer on port 8888 (ElevenLabs TTS)
- Next.js App Router patterns in filmroom project
- No existing roleplay/character system, no LiveKit integration

### Risks
- Grok Realtime API has 50 concurrent WebSocket session limit and 600s TTL
- Token budget management complexity with multi-agent context envelopes
- LiveKit adds significant complexity; may not be needed for Phase 1-2
- pgvector HNSW index performance at scale with high-dimensional embeddings
- Streaming TTS while maintaining conversational flow (P95 < 3s target)

## Criteria

- [x] ISC-1: Plan covers all 4 development phases with clear scope boundaries
- [x] ISC-2: Phase 1 MVP scope is minimal viable, not bloated
- [x] ISC-3: Supabase schema defined for characters table
- [x] ISC-4: Supabase schema defined for personas table
- [x] ISC-5: Supabase schema defined for scenarios table
- [x] ISC-6: Supabase schema defined for sessions table
- [x] ISC-7: Supabase schema defined for memory_ltm table with vector column
- [x] ISC-8: Supabase schema defined for advanced_prompt_presets table
- [x] ISC-9: Supabase schema defined for turns table (normalized from session)
- [x] ISC-10: RLS policies specified for each table
- [x] ISC-11: Next.js project structure defined with route groups
- [x] ISC-12: App Router page hierarchy documented
- [x] ISC-13: Server Actions identified for API proxying
- [x] ISC-14: Client components identified for live session UI
- [x] ISC-15: Grok TTS integration approach documented
- [x] ISC-16: Grok Realtime API integration approach documented
- [x] ISC-17: Token management pattern specified (ephemeral tokens)
- [x] ISC-18: Context envelope assembly logic documented
- [x] ISC-19: Token budget rules specified with compression triggers
- [x] ISC-20: STM window management approach defined
- [x] ISC-21: LTM write triggers specified (auto + manual)
- [x] ISC-22: LTM semantic search function defined
- [x] ISC-23: Embedding model and dimensions specified
- [x] ISC-24: Character builder UI components identified
- [x] ISC-25: Scenario editor UI components identified
- [x] ISC-26: Session UI layout defined (transcript + audio controls)
- [x] ISC-27: Voice input flow documented (STT, confirm, inject)
- [x] ISC-28: Voice output flow documented (LLM, TTS, stream)
- [x] ISC-29: Multi-agent turn routing logic specified
- [x] ISC-30: Character voice assignment persistence defined
- [x] ISC-31: Persona injection pattern specified ({{user}} replacement)
- [x] ISC-32: Advanced prompt priority hierarchy documented
- [x] ISC-33: Session state recovery approach defined
- [x] ISC-34: Content moderation controls specified (SFW/mature)
- [x] ISC-35: Auth flow defined (Supabase Auth with OAuth)
- [x] ISC-36: Edge Function responsibilities enumerated
- [x] ISC-37: Reusable code from GrokVoice identified with file paths
- [x] ISC-38: Reusable patterns from filmroom identified
- [x] ISC-39: Reusable patterns from second-brain/OpenBrain identified
- [x] ISC-40: LiveKit integration deferred to Phase 4 with rationale
- [x] ISC-41: API key security approach documented (never client-exposed)
- [x] ISC-42: Streaming synthesis approach defined (TTS before full LLM response)
- [x] ISC-43: Memory browser UI approach defined
- [x] ISC-44: Export/portability approach specified
- [x] ISC-45: Performance targets documented with mitigation strategies
- [x] ISC-46: File-by-file implementation order for Phase 1
- [x] ISC-47: Dependencies and package list for Phase 1
- [x] ISC-48: Verification approach defined (how to test each phase)

## Decisions

## Verification

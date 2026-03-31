# Grok Voice Roleplay Agent Platform -- Implementation Plan

## Context

Build a multi-agent roleplay platform powered by Grok voice for immersive interactive fiction. Users create characters with distinct voice profiles, build scenarios, play as personas, and interact via voice or text. Short-term and long-term memory persists across sessions.

Inspired by JanitorAI.com. Production-grade: Grok TTS/STT, Supabase + pgvector, Next.js 15 frontend.

**Greenfield project** at `/Users/sst/Projects/RolePlay/`. No existing code.

### GitHub Repository

Create new repo `sst/roleplay` (or `sst/grok-roleplay`) on GitHub. Initialize with:
- `.gitignore` (Next.js template)
- `README.md` (project overview)
- MIT license
- Main branch protection (optional)

### Harness Pattern

The Session Orchestrator follows the PAI harness pattern (ref: C4Architecture, WorldThreatModelHarness, Evals). The harness owns the entire session lifecycle:

```
Session Start → Context Assembly → [CHECKPOINT: token budget audit]
  → Agent Turn Loop:
      User Input → STT/Text → Context Inject
      → LLM Generation → [CHECKPOINT: safety/content rating]
      → TTS Synthesis → Audio Stream + Transcript
      → Turn Persistence → [CHECKPOINT: STM threshold]
      → Memory Triggers (auto-extract every 10 turns)
      → Multi-Agent Routing (Phase 3)
  → Session End → [GATE: confirm end] → LTM Summarization → State Persist
```

**Harness characteristics applied:**
1. **Phase-based orchestration:** Session lifecycle has distinct phases (setup, active, compression, teardown)
2. **Checkpoints:** Token budget audit before each turn, STM threshold check after each turn, content rating validation
3. **Approval gates:** Session end confirmation, memory pin confirmation
4. **State persistence:** Full session state in Supabase, recoverable after disconnect
5. **Sub-agent coordination:** Multiple characters coordinated by the orchestrator (Phase 3)
6. **Adversarial evaluation:** Content rating enforcement, prompt injection detection in user input

**Harness state machine:**
```
IDLE → CONNECTING → ACTIVE → RECONNECTING → ACTIVE → ... → ENDING → ENDED
                      ↓                                        ↓
                  COMPRESSING (STM)                      SUMMARIZING (LTM)
```

**Agent inventory (7 roles across all phases):**

| # | Agent | Phase | Role | Implementation |
|---|-------|-------|------|---------------|
| 1 | Session Orchestrator | 1 | Harness coordinator. Lifecycle, context assembly, checkpoints, state transitions | `session-orchestrator.ts` |
| 2 | Character Agent | 1 | One per NPC. Grok-3 with personality prompt + distinct voice | xAI Realtime API WebSocket |
| 3 | STM Compressor | 1 | Triggered when turn count > 20. Summarizes conversation window | Grok-3 text API call |
| 4 | Memory Writer | 2 | Auto-extracts facts every 10 turns + session-end summarization. Embeds and writes to LTM | Edge Function (background) |
| 5 | Memory Retriever | 2 | Semantic search over LTM before each turn. Injects relevant memories into context | `ltm-search.ts` via pgvector |
| 6 | Turn Router | 3 | Decides which character responds next (name addressing, scenario order, default) | `turn-router.ts` |
| 7 | Narrator Agent | 3 | Neutral voice for scene-setting. Handles `[scene:]`, `[mood:]` directives | Separate Grok voice profile |

In a Phase 3 multi-character session with 3 NPCs: **9 active agents** (orchestrator + 3 characters + narrator + router + STM compressor + memory writer + memory retriever).

### Existing Assets to Reuse

| Asset | Path | What to reuse |
|-------|------|--------------|
| GrokVoice WebSocket hook | `~/.claude/skills/GrokVoice/web/app/hooks/useVoiceAgent.ts` | WebSocket lifecycle, AudioWorklet PCM16 pipeline, token refresh, interrupt handling, audio playback queue |
| Token minting route | `~/.claude/skills/GrokVoice/web/app/api/token/route.ts` | Ephemeral client secret pattern (never expose raw API key) |
| Session UI patterns | `~/.claude/skills/GrokVoice/web/app/page.tsx` | StatusBadge, transcript display, mic button, text input |
| AudioWorklet processor | `~/.claude/skills/GrokVoice/web/public/pcm-processor-worklet.js` | PCM16 audio capture worklet |
| pgvector + embeddings | `/Users/sst/Projects/second-brain/src/storage/openbrain.ts` | Supabase REST + text-embedding-3-small pattern |
| Next.js App Router | `/Users/sst/Projects/filmroom/frontend/` | Route groups, providers pattern, API client |

### Key Architectural Decisions

1. **Skip LiveKit for Phase 1-2.** Direct xAI WebSocket (proven in GrokVoice) handles single-user sessions. LiveKit only needed for multi-user (Phase 4).

2. **Next.js Server Actions for orchestration.** Not Supabase Edge Functions. Avoids cold starts, keeps logic in one codebase. Edge Functions only for background tasks (session-end summarization).

3. **Turns normalized to own table.** Not embedded in Session. Enables efficient queries, memory triggers, and pagination.

4. **New dedicated Supabase project.** Clean separation from OpenBrain. Uses `public` schema directly.

5. **WebSocket reconnection strategy.** 600s TTL handled by auto-reconnect with fresh token + updated context envelope. Client transcript persists across reconnects.

6. **Voice comes from Grok Realtime API natively.** No separate STT+LLM+TTS pipeline in Phase 1. Grok generates speech directly, keeping latency under 1.5s P95.

7. **Harness pattern for session orchestrator.** Phase-based lifecycle with checkpoints (token budget, STM threshold, content rating), approval gates (session end, memory pin), state persistence in Supabase, and sub-agent coordination (Phase 3).

---

## Phase 1 -- MVP (Core Loop)

Single character, single user, voice + text. Character CRUD, session play, basic STM. No personas (deferred to Phase 2), no scenarios, no multi-agent, no public gallery, no LTM yet.

### Next.js Project Structure

```
src/
  app/
    layout.tsx                          # Server -- root layout, Inter font, dark mode
    globals.css                         # Tailwind globals
    providers.tsx                       # Client -- AuthProvider wrapper
    page.tsx                            # Server -- landing/redirect to /characters

    (auth)/
      login/page.tsx                    # Client -- Supabase OAuth (Google, Discord)
      callback/route.ts                 # API Route -- OAuth callback

    (app)/
      layout.tsx                        # Server -- authenticated shell, sidebar nav
      characters/
        page.tsx                        # Server -- character list (RSC + Suspense)
        new/page.tsx                    # Client -- character builder form
        [id]/
          page.tsx                      # Server -- character detail/edit
          edit/page.tsx                 # Client -- character editor
      sessions/
        page.tsx                        # Server -- session history list
        [id]/page.tsx                   # Client -- LIVE SESSION UI
      settings/
        page.tsx                        # Client -- user prefs, voice defaults

    api/
      token/route.ts                    # POST -- mint ephemeral xAI client secret
      session/
        route.ts                        # POST -- create new session
        [id]/
          context/route.ts              # GET -- assemble context envelope
          turns/route.ts                # POST -- persist a turn
          end/route.ts                  # POST -- end session

  components/
    ui/                                 # shadcn/ui primitives
    character-card.tsx                  # Server -- character list card
    character-form.tsx                  # Client -- multi-tab character builder
    session-panel.tsx                   # Client -- live transcript display
    voice-controls.tsx                  # Client -- mic button, status badge
    nav-sidebar.tsx                     # Client -- app navigation
    user-menu.tsx                       # Client -- auth state, logout

  hooks/
    use-voice-session.ts                # Client -- adapted from useVoiceAgent.ts
    use-supabase.ts                     # Client -- Supabase client singleton
    use-auth.ts                         # Client -- auth state
    use-session-state.ts                # Client -- session metadata + reconnection

  lib/
    supabase/
      client.ts                         # Browser Supabase client
      server.ts                         # Server Supabase client (cookies)
      admin.ts                          # Service role client
      types.ts                          # Generated database types
    xai/
      token.ts                          # Ephemeral token minting
      context-assembler.ts              # Build context envelope
      prompt-templates.ts               # System prompt templates with {{user}}
      session-orchestrator.ts           # Harness core: lifecycle, checkpoints, state
    memory/
      stm-compressor.ts                 # Compress STM window
    utils.ts                            # cn() helper

  actions/
    characters.ts                       # Server Actions: CRUD
    sessions.ts                         # Server Actions: create, end, list
    auth.ts                             # Server Actions: signOut

public/
  pcm-processor-worklet.js             # AudioWorklet (copy from GrokVoice)
```

### Supabase Schema

```sql
-- New dedicated Supabase project, using public schema
-- Enable pgvector extension first

-- Profiles (auto-created on signup)
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url   TEXT,
  default_voice TEXT NOT NULL DEFAULT 'Eve'
    CHECK (default_voice IN ('Ara','Rex','Sal','Eve','Leo')),
  content_rating TEXT NOT NULL DEFAULT 'sfw'
    CHECK (content_rating IN ('sfw','mature')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Characters
CREATE TABLE public.characters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  chat_name     TEXT,
  bio           TEXT NOT NULL DEFAULT '',
  personality   TEXT NOT NULL DEFAULT '',
  scenario      TEXT,
  initial_message TEXT,
  voice_id      TEXT NOT NULL DEFAULT 'eve'
    CHECK (voice_id IN ('ara','rex','sal','eve','leo')),
  tags          TEXT[] DEFAULT '{}',
  visibility    TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private','public')),
  content_rating TEXT NOT NULL DEFAULT 'sfw'
    CHECK (content_rating IN ('sfw','mature')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_characters_owner ON public.characters(owner_id);
CREATE INDEX idx_characters_public ON public.characters(visibility) WHERE visibility = 'public';
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own characters" ON public.characters FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Anyone reads public characters" ON public.characters FOR SELECT USING (visibility = 'public');

-- Personas
CREATE TABLE public.personas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_name         TEXT NOT NULL,
  persona_description  TEXT NOT NULL DEFAULT '',
  persona_appearance   TEXT,
  is_default           BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_personas_owner ON public.personas(owner_id);
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own personas" ON public.personas FOR ALL USING (auth.uid() = owner_id);

-- Scenarios (Phase 2, schema created now for forward-compat)
CREATE TABLE public.scenarios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_title      TEXT NOT NULL,
  scenario_description TEXT NOT NULL DEFAULT '',
  time_period         TEXT,
  setting             TEXT,
  default_cast        UUID[] DEFAULT '{}',
  visibility          TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private','public')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own scenarios" ON public.scenarios FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Anyone reads public scenarios" ON public.scenarios FOR SELECT USING (visibility = 'public');

-- Advanced Prompt Presets (Phase 2, schema created now)
CREATE TABLE public.advanced_prompt_presets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  prompt_text  TEXT NOT NULL DEFAULT '',
  directives   TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.advanced_prompt_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own presets" ON public.advanced_prompt_presets FOR ALL USING (auth.uid() = owner_id);

-- Sessions
CREATE TABLE public.sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id          UUID REFERENCES public.scenarios(id) ON DELETE SET NULL,
  persona_id           UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  active_character_ids UUID[] NOT NULL DEFAULT '{}',
  advanced_prompt      TEXT,
  status               TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','ended')),
  stm_summary          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON public.sessions(user_id);
CREATE INDEX idx_sessions_active ON public.sessions(user_id, status) WHERE status = 'active';
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON public.sessions FOR ALL USING (auth.uid() = user_id);

-- Turns (normalized)
CREATE TABLE public.turns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  speaker      TEXT NOT NULL,  -- 'user' or character UUID
  text         TEXT NOT NULL,
  audio_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_turns_session ON public.turns(session_id, created_at);
ALTER TABLE public.turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own turns" ON public.turns FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users insert own turns" ON public.turns FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

-- Long-Term Memory (Phase 2, schema created now)
CREATE TABLE public.memory_ltm (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id             UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  character_ids_involved UUID[] DEFAULT '{}',
  content                TEXT NOT NULL,
  embedding              vector(1536),
  tags                   TEXT[] DEFAULT '{}',
  importance_score       REAL NOT NULL DEFAULT 0.5
    CHECK (importance_score >= 0 AND importance_score <= 1),
  source                 TEXT NOT NULL DEFAULT 'auto'
    CHECK (source IN ('auto','manual')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_memory_user ON public.memory_ltm(user_id);
CREATE INDEX idx_memory_embedding ON public.memory_ltm
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
ALTER TABLE public.memory_ltm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own memories" ON public.memory_ltm FOR ALL USING (auth.uid() = user_id);

-- Semantic search function
CREATE OR REPLACE FUNCTION public.match_memories(
  query_embedding vector(1536),
  match_threshold REAL DEFAULT 0.75,
  match_count INTEGER DEFAULT 3,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (id UUID, content TEXT, similarity REAL, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE AS $$
  SELECT m.id, m.content,
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.created_at
  FROM public.memory_ltm m
  WHERE m.user_id = p_user_id
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Phase 1 Build Order (12 steps)

0. **GitHub repo:** `gh repo create sst/roleplay --public --clone`, initialize git, add `.gitignore`, `README.md`, `CLAUDE.md` (project conventions)
1. **Project scaffold:** `npx create-next-app@latest` with App Router + Tailwind + TypeScript + src/ directory, then `package.json` tweaks, `.env.local`
2. **Supabase project:** Create new project via MCP, apply DDL migrations
3. **Core lib:** `supabase/client.ts`, `server.ts`, `admin.ts`, `types.ts`, `utils.ts`
4. **Auth:** `providers.tsx`, `use-auth.ts`, login page, callback route
5. **App shell:** Root layout, `(app)` layout, sidebar, user menu, shadcn/ui primitives
6. **Character CRUD:** Server actions, list page, character card, character form, new/edit pages
7. **Voice infrastructure:** Copy AudioWorklet, token route, `context-assembler.ts`, `prompt-templates.ts`, `use-voice-session.ts`
8. **Session API:** Create/end/context/turns routes, `use-session-state.ts`
9. **Live session UI:** Session page, transcript panel, voice controls
10. **STM compression:** `stm-compressor.ts` triggered when turn count > 20
11. **Session history:** Sessions list page

### Dependencies (Phase 1)

```json
{
  "next": "^15",
  "react": "^19",
  "react-dom": "^19",
  "@supabase/supabase-js": "^2",
  "@supabase/ssr": "^0.5",
  "tailwindcss": "^3.4",
  "postcss": "^8",
  "autoprefixer": "^10",
  "class-variance-authority": "^0.7",
  "clsx": "^2",
  "tailwind-merge": "^2",
  "lucide-react": "^0.400"
}
```

Plus shadcn/ui Radix primitives (Button, Card, Dialog, Input, Textarea, Select, Tabs, Badge, ScrollArea, Avatar).

---

## Session Orchestrator (Harness)

The session orchestrator is the harness core. It lives in `src/lib/xai/session-orchestrator.ts` and coordinates:
- Context envelope assembly (what the LLM sees)
- Turn lifecycle (input, generation, output, persistence)
- Checkpoint evaluation (token budget, STM threshold, content rating)
- State transitions (connecting, active, reconnecting, ending)
- Memory triggers (auto-extract, manual pin, session-end summary)

### Context Envelope

### Assembly (per turn / per reconnect)

```
[SYSTEM]
You are {character.name}. {character.personality}
You are in a roleplay conversation. Stay in character at all times.
Address the player as {persona.persona_name}.
{persona.persona_description}

[ADVANCED PROMPT - if set]
{session.advanced_prompt}

[SCENARIO - Phase 2]
{scenario.scenario_description}
Setting: {scenario.setting} | Time: {scenario.time_period}

[LONG-TERM MEMORY - Phase 2]
From past sessions you recall:
{top-3 LTM results by cosine similarity}

[SHORT-TERM MEMORY]
{session.stm_summary if exists}
Recent conversation:
{last 20 turns from turns table}
```

### Token Budget

| Segment | Max tokens |
|---------|-----------|
| Character personality | 2,500 |
| Persona description | 500 |
| Advanced prompt | 500 |
| Scenario (Phase 2) | 500 |
| LTM results (Phase 2) | 500 |
| STM summary | 500 |
| Recent turns (STM window) | 4,000 |
| **Total context** | **~8,500** |

### STM Compression

- Trigger: turn count since last compression > 20 OR estimated STM tokens > 4,000
- Action: Call `grok-3` text API with recent turns + previous summary, ask for 200-token narrative summary
- Store summary in `sessions.stm_summary`, reset window

### LTM Write (Phase 2)

- **Auto (session end):** Summarize full transcript into 3-5 memory entries, embed each, write to `memory_ltm`
- **Manual (mid-session):** User flags a turn as `[remember this]`, immediately embedded and stored
- **Periodic (every 10 turns):** Extract key facts, embed, store with `source = 'auto'`

### LTM Search (Phase 2)

```sql
SELECT content, 1 - (embedding <=> query_embedding) AS similarity
FROM public.memory_ltm
WHERE user_id = $user_id
  AND similarity > 0.75
ORDER BY similarity DESC
LIMIT 3;
```

---

## Voice Pipeline

### Voice Output (Grok Realtime API)

1. Client calls `GET /api/session/{id}/context` to get assembled instructions
2. Client opens WebSocket to `wss://api.x.ai/v1/realtime`
3. Sends `session.update` with `{ voice: character.voice_id, instructions: contextEnvelope }`
4. User speaks into AudioWorklet, PCM16 chunks sent via `input_audio_buffer.append`
5. Server VAD detects speech end, auto-commits
6. Grok responds with `response.output_audio.delta` (PCM16 chunks) + `response.output_audio_transcript.delta` (text)
7. Client plays audio via AudioBufferSourceNode, shows text in transcript

### Voice Input (Text confirmation flow - Phase 2)

For Phase 1, Grok Realtime handles STT natively. The transcript appears automatically.
Phase 2 adds an optional confirm-before-send mode for voice input.

### WebSocket Reconnection (600s TTL)

1. `ws.onclose` fires when TTL expires
2. If not intentional disconnect: set status "reconnecting"
3. Fetch fresh ephemeral token via `/api/token`
4. Fetch updated context envelope via `/api/session/{id}/context` (includes any new STM summary)
5. Open new WebSocket with fresh context
6. Client transcript preserved in React state (source of truth during session)
7. User sees brief "Reconnecting..." badge, then resumes

---

## Multi-Agent Turn Routing (Phase 3)

- Each character gets its own WebSocket connection (one active at a time)
- `current_speaker` tracked in session state
- Routing logic: explicit name addressing > scenario turn order > last speaker
- On character switch: close current WS, open new with different voice + personality
- All characters share scenario context but have individual personality prompts

---

## Phase 2 -- Personas, Voice Input, and Memory

- Persona system: CRUD, swap between sessions, `{{user}}` injection into character context
- LTM write/read (pgvector semantic search)
- STM compression (already scaffolded in Phase 1)
- Voice input with optional confirm-before-send
- Scenario system with default cast

## Phase 3 -- Multi-Agent and Advanced Authoring

- Multi-character sessions with turn routing
- Advanced prompt editor with directive presets
- Creator Studio: full character builder with voice audition, scenario editor
- Memory browser UI (view, search, edit, delete LTM entries)

## Phase 4 -- Community and Scale

- Public character/scenario library with tags and search
- Session sharing and replay
- LiveKit integration for multi-user sessions
- Rate limiting, content moderation
- Export/portability (JSON export of characters, personas, memories)

---

## Performance Targets

| Metric | Target | Mitigation |
|--------|--------|-----------|
| Agent response P95 | < 3s | Grok Realtime native voice (no separate STT+LLM+TTS) |
| TTS first audio | < 1s | Streaming from Realtime API, not batch TTS |
| LTM search | < 500ms | HNSW index with m=16, ef_construction=64 |
| Session recovery | < 5s | State in Supabase, auto-reconnect on disconnect |
| Context assembly | < 500ms | Server Actions (no Edge Function cold start) |

---

## Verification

- **Schema:** Run migrations, verify tables exist with `list_tables`
- **Auth:** Sign up, verify profile auto-created, verify RLS blocks cross-user access
- **Character CRUD:** Create, read, update, delete; verify RLS
- **Session flow:** Create session, connect WebSocket, send text, receive voice response
- **STM compression:** Play 25+ turns, verify summary generated
- **Reconnection:** Wait for 600s TTL, verify auto-reconnect works
- **LTM (Phase 2):** End session, verify memories written, search returns relevant results

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type VoiceId = "ara" | "rex" | "sal" | "eve" | "leo";
export type Visibility = "private" | "public";
export type ContentRating = "sfw" | "mature";
export type SessionStatus = "active" | "paused" | "ended";
export type MemorySource = "auto" | "manual";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          default_voice: VoiceId;
          content_rating: ContentRating;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_url?: string | null;
          default_voice?: VoiceId;
          content_rating?: ContentRating;
        };
        Update: {
          display_name?: string;
          avatar_url?: string | null;
          default_voice?: VoiceId;
          content_rating?: ContentRating;
          updated_at?: string;
        };
        Relationships: [];
      };
      characters: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          chat_name: string | null;
          bio: string;
          personality: string;
          scenario: string | null;
          initial_message: string | null;
          voice_id: VoiceId;
          tags: string[];
          visibility: Visibility;
          content_rating: ContentRating;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          chat_name?: string | null;
          bio?: string;
          personality?: string;
          scenario?: string | null;
          initial_message?: string | null;
          voice_id?: VoiceId;
          tags?: string[];
          visibility?: Visibility;
          content_rating?: ContentRating;
        };
        Update: {
          name?: string;
          chat_name?: string | null;
          bio?: string;
          personality?: string;
          scenario?: string | null;
          initial_message?: string | null;
          voice_id?: VoiceId;
          tags?: string[];
          visibility?: Visibility;
          content_rating?: ContentRating;
          updated_at?: string;
        };
        Relationships: [];
      };
      personas: {
        Row: {
          id: string;
          owner_id: string;
          persona_name: string;
          persona_description: string;
          persona_appearance: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          persona_name: string;
          persona_description?: string;
          persona_appearance?: string | null;
          is_default?: boolean;
        };
        Update: {
          persona_name?: string;
          persona_description?: string;
          persona_appearance?: string | null;
          is_default?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      scenarios: {
        Row: {
          id: string;
          owner_id: string;
          scenario_title: string;
          scenario_description: string;
          time_period: string | null;
          setting: string | null;
          default_cast: string[];
          visibility: Visibility;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          scenario_title: string;
          scenario_description?: string;
          time_period?: string | null;
          setting?: string | null;
          default_cast?: string[];
          visibility?: Visibility;
        };
        Update: {
          scenario_title?: string;
          scenario_description?: string;
          time_period?: string | null;
          setting?: string | null;
          default_cast?: string[];
          visibility?: Visibility;
          updated_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          scenario_id: string | null;
          persona_id: string | null;
          active_character_ids: string[];
          advanced_prompt: string | null;
          status: SessionStatus;
          stm_summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          scenario_id?: string | null;
          persona_id?: string | null;
          active_character_ids?: string[];
          advanced_prompt?: string | null;
          status?: SessionStatus;
        };
        Update: {
          scenario_id?: string | null;
          persona_id?: string | null;
          active_character_ids?: string[];
          advanced_prompt?: string | null;
          status?: SessionStatus;
          stm_summary?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      turns: {
        Row: {
          id: string;
          session_id: string;
          speaker: string;
          text: string;
          audio_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          speaker: string;
          text: string;
          audio_url?: string | null;
        };
        Update: {
          text?: string;
          audio_url?: string | null;
        };
        Relationships: [];
      };
      memory_ltm: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          character_ids_involved: string[];
          content: string;
          embedding: number[] | null;
          tags: string[];
          importance_score: number;
          source: MemorySource;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          character_ids_involved?: string[];
          content: string;
          embedding?: number[] | null;
          tags?: string[];
          importance_score?: number;
          source?: MemorySource;
        };
        Update: {
          content?: string;
          embedding?: number[] | null;
          tags?: string[];
          importance_score?: number;
          source?: MemorySource;
        };
        Relationships: [];
      };
      advanced_prompt_presets: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          prompt_text: string;
          directives: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          prompt_text?: string;
          directives?: string[];
        };
        Update: {
          name?: string;
          prompt_text?: string;
          directives?: string[];
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_memories: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
          p_user_id?: string;
        };
        Returns: {
          id: string;
          content: string;
          similarity: number;
          created_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
}

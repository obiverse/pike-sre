/**
 * Core types for Pike's Structural Regular Expressions
 */

/**
 * A Command takes input text and returns transformed output.
 * This is the fundamental unit of composition.
 */
export type Command = (input: string) => string;

/**
 * Match result from a regex operation
 */
export interface Match {
  /** The full matched text */
  text: string;
  /** Start index in original string */
  start: number;
  /** End index in original string */
  end: number;
  /** Capture groups (group 0 is full match) */
  groups: string[];
}

/**
 * Context passed through command pipelines
 */
export interface Context {
  /** Original input before any transformations */
  original: string;
  /** Path segments (for path-based patterns) */
  path?: string[];
  /** Arbitrary data for template substitution */
  data?: Record<string, unknown>;
  /** Regex capture groups from x command */
  captures?: string[];
}

/**
 * Pattern definition (scroll-style, compatible with 9S)
 */
export interface PatternDef {
  /** Pattern name/identifier */
  name: string;
  /** Glob pattern for paths to watch */
  watch: string;
  /** Extract regex with capture groups */
  x?: string;
  /** Guard regex - must match for pattern to apply */
  g?: string;
  /** Veto regex - skip if matches */
  v?: string;
  /** Output type identifier */
  emit: string;
  /** Output path template */
  emit_path: string;
  /** Output data template */
  template: unknown;
  /** Cascade to next pattern */
  then?: string;
}

/**
 * Compiled pattern with cached regexes
 */
export interface CompiledPattern {
  name: string;
  watch: string;
  watchMatcher: (path: string) => boolean;
  x?: RegExp;
  g?: RegExp;
  v?: RegExp;
  emit: string;
  emit_path: string;
  template: unknown;
  then?: string;
}

/**
 * Scroll structure (9S compatible)
 */
export interface Scroll {
  key: string;
  type: string;
  metadata?: {
    version?: number;
    hash?: string;
    created_at?: string;
    updated_at?: string;
    produced_by?: string;
  };
  data: unknown;
}

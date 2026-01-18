/**
 * Pattern: 9S-compatible pattern definition and compilation
 *
 * A Pattern combines Pike's SRE concepts with scroll-based reactivity:
 * - watch: glob pattern for paths
 * - x: extract regex
 * - g: guard regex
 * - v: veto regex
 * - emit: output type
 * - emit_path: output path template
 * - template: output data template
 */

import { compileGlob } from './glob';
import { parsePath, substituteString, substituteValue } from './template';
import type { CompiledPattern, PatternDef, Scroll } from './types';

/**
 * Compile a pattern definition into an executable pattern
 */
export function compilePattern(def: PatternDef): CompiledPattern {
  const glob = compileGlob(def.watch);

  return {
    name: def.name,
    watch: def.watch,
    watchMatcher: glob.matches,
    x: def.x ? new RegExp(def.x) : undefined,
    g: def.g ? new RegExp(def.g) : undefined,
    v: def.v ? new RegExp(def.v) : undefined,
    emit: def.emit,
    emit_path: def.emit_path,
    template: def.template,
    then: def.then,
  };
}

/**
 * Apply a compiled pattern to a scroll
 * Returns the reaction scroll if matched, null otherwise
 */
export function applyPattern(pattern: CompiledPattern, scroll: Scroll): Scroll | null {
  // 1. Check path matches watch glob
  if (!pattern.watchMatcher(scroll.key)) {
    return null;
  }

  // Serialize data for regex matching
  const dataStr = typeof scroll.data === 'string' ? scroll.data : JSON.stringify(scroll.data);

  // 2. Check guard (must match)
  if (pattern.g && !pattern.g.test(dataStr)) {
    return null;
  }

  // 3. Check veto (skip if matches)
  if (pattern.v?.test(dataStr)) {
    return null;
  }

  // 4. Extract captures if x is defined
  let captures: string[] = [];
  if (pattern.x) {
    const match = dataStr.match(pattern.x);
    if (match) {
      captures = [...match];
    }
  }

  // 5. Build template context
  const pathSegments = parsePath(scroll.key);
  const ctx = {
    captures,
    path: pathSegments,
    data:
      typeof scroll.data === 'object' && scroll.data !== null
        ? (scroll.data as Record<string, unknown>)
        : {},
    input: dataStr,
  };

  // 6. Generate output path
  const outputPath = substituteString(pattern.emit_path, ctx);

  // 7. Generate output data
  const outputData = substituteValue(pattern.template, ctx);

  return {
    key: outputPath,
    type: pattern.emit,
    metadata: {
      version: 1,
      produced_by: pattern.name,
    },
    data: outputData,
  };
}

/**
 * Pattern engine that manages multiple patterns
 */
export class PatternEngine {
  private patterns: Map<string, CompiledPattern> = new Map();

  /**
   * Add a pattern to the engine
   */
  add(def: PatternDef): CompiledPattern {
    const compiled = compilePattern(def);
    this.patterns.set(compiled.name, compiled);
    return compiled;
  }

  /**
   * Remove a pattern by name
   */
  remove(name: string): boolean {
    return this.patterns.delete(name);
  }

  /**
   * Get a pattern by name
   */
  get(name: string): CompiledPattern | undefined {
    return this.patterns.get(name);
  }

  /**
   * List all pattern names
   */
  list(): string[] {
    return Array.from(this.patterns.keys());
  }

  /**
   * Apply all matching patterns to a scroll
   * Returns all reaction scrolls (may be empty)
   */
  apply(scroll: Scroll): Scroll[] {
    const reactions: Scroll[] = [];
    const visited = new Set<string>();

    // Initial scroll to process
    const queue: Scroll[] = [scroll];

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Prevent infinite loops
      const key = `${current.key}:${current.type}`;
      if (visited.has(key)) continue;
      visited.add(key);

      for (const pattern of this.patterns.values()) {
        const reaction = applyPattern(pattern, current);
        if (reaction) {
          reactions.push(reaction);

          // Handle cascade (then)
          if (pattern.then) {
            const nextPattern = this.patterns.get(pattern.then);
            if (nextPattern) {
              queue.push(reaction);
            }
          }
        }
      }
    }

    return reactions;
  }

  /**
   * Apply a single named pattern to a scroll
   */
  applyOne(patternName: string, scroll: Scroll): Scroll | null {
    const pattern = this.patterns.get(patternName);
    if (!pattern) return null;
    return applyPattern(pattern, scroll);
  }

  /**
   * Test if any pattern would match a scroll (without generating reactions)
   */
  wouldMatch(scroll: Scroll): string[] {
    const matched: string[] = [];
    const dataStr = typeof scroll.data === 'string' ? scroll.data : JSON.stringify(scroll.data);

    for (const [name, pattern] of this.patterns) {
      if (!pattern.watchMatcher(scroll.key)) continue;
      if (pattern.g && !pattern.g.test(dataStr)) continue;
      if (pattern.v?.test(dataStr)) continue;
      matched.push(name);
    }

    return matched;
  }

  /**
   * Clear all patterns
   */
  clear(): void {
    this.patterns.clear();
  }

  /**
   * Get pattern count
   */
  get size(): number {
    return this.patterns.size;
  }
}

/**
 * Create a pattern from a concise object literal
 */
export function pattern(def: PatternDef): CompiledPattern {
  return compilePattern(def);
}

/**
 * Quick pattern for logging all writes
 */
export function loggerPattern(watchGlob = '/**'): PatternDef {
  return {
    name: 'logger',
    watch: watchGlob,
    emit: 'log/write@v1',
    emit_path: '/logs/${uuid}',
    template: {
      path: '${input}',
      timestamp: '${uuid}',
    },
  };
}

/**
 * Quick pattern for extracting emails
 */
export function emailExtractorPattern(watchGlob = '/**'): PatternDef {
  return {
    name: 'email-extractor',
    watch: watchGlob,
    x: '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
    emit: 'extracted/email@v1',
    emit_path: '/extracted/emails/${uuid}',
    template: {
      email: '${1}',
      source: '${path.0}/${path.1}',
    },
  };
}

/**
 * Quick pattern for type-based indexing
 */
export function typeIndexPattern(typeFilter: string, watchGlob = '/**'): PatternDef {
  return {
    name: `index-${typeFilter}`,
    watch: watchGlob,
    g: typeFilter,
    emit: `index/${typeFilter}@v1`,
    emit_path: `/indexes/${typeFilter}/\${uuid}`,
    template: {
      path: '${path.0}/${path.1}',
      data: '${data}',
    },
  };
}

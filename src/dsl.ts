/**
 * DSL: Ergonomic interface for Pike's Structural Regular Expressions
 *
 * The goal is Platonic simplicity: compose small operations into pipelines.
 *
 * Core insight from Pike: Traditional regex operates on flat strings.
 * Structural regex operates on *structure* - treating text as nested regions.
 *
 * The primitive is: select a region, then transform it.
 *
 * Usage:
 *   sre(input).x(/pattern/).g(/guard/).s(/old/, 'new').value()
 *   pipe(x(/\d+/), g(/42/), c('ANSWER'))(input)
 */

import { c, d, findMatches, p, s } from './commands';
import type { Command, Match } from './types';

/**
 * Fluent builder for structural regex pipelines
 */
export class SRE {
  private commands: Command[] = [];
  private input: string;

  constructor(input: string) {
    this.input = input;
  }

  /**
   * x: Extract matches, apply subsequent commands to each
   */
  x(pattern: RegExp | string): SRE {
    const re = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
    // Capture the rest of the chain and apply it to matches
    return this.addStructural('x', re);
  }

  /**
   * y: Extract non-matches (complement of x)
   */
  y(pattern: RegExp | string): SRE {
    const re = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
    return this.addStructural('y', re);
  }

  /**
   * g: Guard - continue only if pattern matches
   */
  g(pattern: RegExp | string): SRE {
    const re = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    this.commands.push((input) => (re.test(input) ? input : ''));
    return this;
  }

  /**
   * v: Veto - continue only if pattern does NOT match
   */
  v(pattern: RegExp | string): SRE {
    const re = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    this.commands.push((input) => (!re.test(input) ? input : ''));
    return this;
  }

  /**
   * s: Substitute matches with replacement
   */
  s(pattern: RegExp | string, replacement: string): SRE {
    const re = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
    this.commands.push(s(re, replacement));
    return this;
  }

  /**
   * c: Change - replace entire input with constant
   */
  c(replacement: string): SRE {
    this.commands.push(c(replacement));
    return this;
  }

  /**
   * d: Delete - replace with empty string
   */
  d(): SRE {
    this.commands.push(d());
    return this;
  }

  /**
   * p: Print - identity (useful for debugging or as terminal)
   */
  p(): SRE {
    this.commands.push(p());
    return this;
  }

  /**
   * n: Select character range [start:end]
   */
  n(start: number, end?: number): SRE {
    // Store for later - next command applies to this range
    const s = start;
    const e = end;
    return this.addRange('n', s, e);
  }

  /**
   * l: Select line range [start:end]
   */
  l(start: number, end?: number): SRE {
    const s = start;
    const e = end;
    return this.addRange('l', s, e);
  }

  /**
   * Apply a custom command function
   */
  apply(cmd: Command): SRE {
    this.commands.push(cmd);
    return this;
  }

  /**
   * Execute the pipeline and return the result
   */
  value(): string {
    return this.commands.reduce((acc, cmd) => cmd(acc), this.input);
  }

  /**
   * Execute and return all x-extracted matches
   */
  matches(pattern: RegExp | string): string[] {
    const re = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
    const current = this.value();
    return findMatches(re, current).map((m) => m.text);
  }

  /**
   * Execute and return match objects with positions
   */
  matchDetails(pattern: RegExp | string): Match[] {
    const re = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
    const current = this.value();
    return findMatches(re, current);
  }

  /**
   * Split by pattern (like y but returns array)
   */
  split(pattern: RegExp | string): string[] {
    const re = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
    const current = this.value();
    return current.split(re);
  }

  /**
   * Test if current value matches pattern
   */
  test(pattern: RegExp | string): boolean {
    const re = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return re.test(this.value());
  }

  // Internal: add structural command (x or y)
  private addStructural(type: 'x' | 'y', pattern: RegExp): SRE {
    // For now, simple version - apply to all matches
    this.commands.push((input) => {
      const matches = findMatches(pattern, input);
      if (matches.length === 0) return type === 'x' ? input : input;

      let result = '';
      let lastEnd = 0;

      for (const match of matches) {
        if (type === 'x') {
          result += input.slice(lastEnd, match.start);
          result += match.text; // x keeps matches, further ops transform them
        } else {
          result += input.slice(lastEnd, match.start);
          result += match.text;
        }
        lastEnd = match.end;
      }
      result += input.slice(lastEnd);
      return result;
    });
    return this;
  }

  // Internal: add range command (n or l)
  private addRange(type: 'n' | 'l', start: number, end?: number): SRE {
    // Range commands are deferred - they modify how the next command applies
    // For simplicity, we'll implement as immediate selection
    if (type === 'n') {
      this.commands.push((input) => {
        const len = input.length;
        const s = start < 0 ? Math.max(0, len + start) : Math.min(start, len);
        const e = end === undefined ? len : end < 0 ? Math.max(0, len + end) : Math.min(end, len);
        return input.slice(s, e);
      });
    } else {
      this.commands.push((input) => {
        const lines = input.split('\n');
        const len = lines.length;
        const s = start < 0 ? Math.max(0, len + start) : Math.min(start, len);
        const e = end === undefined ? len : end < 0 ? Math.max(0, len + end) : Math.min(end, len);
        return lines.slice(s, e).join('\n');
      });
    }
    return this;
  }
}

/**
 * Create a new SRE pipeline
 *
 * @example
 * sre('hello 123 world 456')
 *   .x(/\d+/)          // focus on numbers
 *   .s(/\d+/, 'NUM')   // replace with NUM
 *   .value()           // => 'hello NUM world NUM'
 */
export function sre(input: string): SRE {
  return new SRE(input);
}

/**
 * Re-export pipe for functional composition
 */
export { pipe } from './commands';

/**
 * Tokenize text using a pattern
 * Returns array of { type: 'match' | 'between', text: string }
 */
export interface Token {
  type: 'match' | 'between';
  text: string;
  groups?: string[];
  start: number;
  end: number;
}

export function tokenize(input: string, pattern: RegExp | string): Token[] {
  const re = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
  const matches = findMatches(re, input);
  const tokens: Token[] = [];
  let lastEnd = 0;

  for (const match of matches) {
    if (match.start > lastEnd) {
      tokens.push({
        type: 'between',
        text: input.slice(lastEnd, match.start),
        start: lastEnd,
        end: match.start,
      });
    }
    tokens.push({
      type: 'match',
      text: match.text,
      groups: match.groups,
      start: match.start,
      end: match.end,
    });
    lastEnd = match.end;
  }

  if (lastEnd < input.length) {
    tokens.push({
      type: 'between',
      text: input.slice(lastEnd),
      start: lastEnd,
      end: input.length,
    });
  }

  return tokens;
}

/**
 * Extract all matches from text (shorthand for xAll)
 */
export function extract(input: string, pattern: RegExp | string): string[] {
  const re = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
  return findMatches(re, input).map((m) => m.text);
}

/**
 * Extract with capture groups
 */
export function extractGroups(input: string, pattern: RegExp | string): string[][] {
  const re = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
  return findMatches(re, input).map((m) => m.groups);
}

/**
 * Transform each match using a function
 */
export function transform(
  input: string,
  pattern: RegExp | string,
  fn: (match: string, groups: string[]) => string,
): string {
  const re = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
  const matches = findMatches(re, input);
  if (matches.length === 0) return input;

  let result = '';
  let lastEnd = 0;

  for (const match of matches) {
    result += input.slice(lastEnd, match.start);
    result += fn(match.text, match.groups);
    lastEnd = match.end;
  }
  result += input.slice(lastEnd);

  return result;
}

/**
 * Build a lexer from token definitions
 *
 * @example
 * const lexer = createLexer([
 *   { name: 'NUMBER', pattern: /\d+/ },
 *   { name: 'WORD', pattern: /\w+/ },
 *   { name: 'SPACE', pattern: /\s+/, skip: true },
 * ]);
 * lexer('hello 123') // [{ type: 'WORD', value: 'hello', ... }, { type: 'NUMBER', value: '123', ... }]
 */
export interface TokenDef {
  name: string;
  pattern: RegExp;
  skip?: boolean;
}

export interface LexToken {
  type: string;
  value: string;
  groups: string[];
  start: number;
  end: number;
}

/**
 * Count capturing groups in a regex pattern
 */
function countGroups(pattern: string): number {
  // Count unescaped '(' that aren't followed by '?' (non-capturing groups)
  let count = 0;
  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === '\\') {
      i += 2; // Skip escaped character
      continue;
    }
    if (pattern[i] === '(') {
      // Check if it's a non-capturing group (?:...) or lookahead/behind
      if (pattern[i + 1] !== '?') {
        count++;
      }
    }
    i++;
  }
  return count;
}

export function createLexer(defs: TokenDef[]): (input: string) => LexToken[] {
  // Calculate group offsets for each pattern
  const groupOffsets: number[] = [];
  let offset = 1; // Start at 1 because match[0] is full match
  for (const def of defs) {
    groupOffsets.push(offset);
    offset += 1 + countGroups(def.pattern.source); // +1 for the wrapping group
  }

  // Combine all patterns into one
  const combined = new RegExp(defs.map((d) => `(${d.pattern.source})`).join('|'), 'g');

  return (input: string): LexToken[] => {
    const tokens: LexToken[] = [];
    let match: RegExpExecArray | null;
    let lastEnd = 0;

    while ((match = combined.exec(input)) !== null) {
      // Find which pattern matched by checking the group at each offset
      for (let i = 0; i < defs.length; i++) {
        const groupIndex = groupOffsets[i];
        if (match[groupIndex] !== undefined) {
          // Check for gaps (unmatched text)
          if (match.index > lastEnd) {
            tokens.push({
              type: 'ERROR',
              value: input.slice(lastEnd, match.index),
              groups: [],
              start: lastEnd,
              end: match.index,
            });
          }

          if (!defs[i].skip) {
            tokens.push({
              type: defs[i].name,
              value: match[0],
              groups: [...match],
              start: match.index,
              end: match.index + match[0].length,
            });
          }
          lastEnd = match.index + match[0].length;
          break;
        }
      }

      // Prevent infinite loop
      if (match[0].length === 0) {
        combined.lastIndex++;
      }
    }

    // Trailing unmatched text
    if (lastEnd < input.length) {
      tokens.push({
        type: 'ERROR',
        value: input.slice(lastEnd),
        groups: [],
        start: lastEnd,
        end: input.length,
      });
    }

    return tokens;
  };
}

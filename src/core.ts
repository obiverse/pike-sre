/**
 * @obiverse/pike-sre/core
 *
 * Pure structural regular expressions - no external dependencies.
 * This is the tree-shakeable core that works in any JavaScript runtime.
 *
 * Based on Rob Pike's 1987 paper "Structural Regular Expressions"
 * https://doc.cat-v.org/bell_labs/structural_regexps/
 *
 * @example
 * ```ts
 * import { x, y, g, v, pipe, sre } from '@obiverse/pike-sre/core';
 *
 * // Functional composition
 * const transform = pipe(
 *   x(/\d+/, n => String(Number(n) * 2)),
 *   g(/error/i, s => `[ERROR] ${s}`)
 * );
 *
 * // Fluent API
 * const result = sre('hello 123 world')
 *   .x(/\d+/)
 *   .s(/\d+/, 'NUM')
 *   .value();
 * ```
 */

// Core types (pure)
export type { Command, Match, Context } from './types';

// Pike's core commands
export {
  findMatches,
  x,
  y,
  g,
  v,
  p,
  d,
  c,
  s,
  n,
  l,
  pipe,
  xAll,
  xFirst,
  ifMatch,
} from './commands';

// Fluent DSL
export {
  sre,
  pipe as chain, // alias for discoverability
  tokenize,
  extract,
  extractGroups,
  transform,
  createLexer,
  SRE,
} from './dsl';
export type { Token, TokenDef, LexToken } from './dsl';

// Template utilities
export {
  substituteString,
  substituteValue,
  generateId,
  parsePath,
  template,
  withCaptures,
} from './template';
export type { TemplateContext } from './template';

// Glob utilities
export {
  compileGlob,
  globMatch,
  globToRegex,
  extractGlobCaptures,
} from './glob';
export type { GlobPattern } from './glob';

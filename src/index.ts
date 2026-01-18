/**
 * @obiverse/pike-sre
 *
 * Pike's Structural Regular Expressions for TypeScript
 *
 * Based on Rob Pike's 1987 paper "Structural Regular Expressions"
 * https://doc.cat-v.org/bell_labs/structural_regexps/
 *
 * ## Quick Start
 *
 * ```ts
 * import { x, y, g, v, pipe, sre } from '@obiverse/pike-sre';
 *
 * // x: extract matches, apply transformation
 * const double = x(/\d+/, n => String(Number(n) * 2));
 * double('a1b2c3'); // => 'a2b4c6'
 *
 * // y: extract non-matches (complement of x)
 * const shout = y(/\d+/, s => s.toUpperCase());
 * shout('hello123world'); // => 'HELLO123WORLD'
 *
 * // g: guard (run command if pattern matches)
 * const errorHandler = g(/error/i, s => `[ALERT] ${s}`);
 *
 * // v: veto (run command if pattern does NOT match)
 * const skipComments = v(/^#/, processLine);
 *
 * // pipe: compose commands left-to-right
 * const pipeline = pipe(
 *   x(/\s+/, () => ' '),        // normalize whitespace
 *   g(/password/i, () => '***') // redact passwords
 * );
 * ```
 *
 * ## Tree-Shaking
 *
 * ```ts
 * // Full library
 * import { x, pipe, PatternEngine } from '@obiverse/pike-sre';
 *
 * // Core only (smaller bundle, no pattern engine)
 * import { x, pipe, sre } from '@obiverse/pike-sre/core';
 *
 * // Individual modules
 * import { compileGlob } from '@obiverse/pike-sre/glob';
 * import { PatternEngine } from '@obiverse/pike-sre/pattern';
 * ```
 *
 * @packageDocumentation
 */

// Re-export everything from core
export * from './core';

// Pattern types (for reactive/document-oriented use)
export type { PatternDef, CompiledPattern, Scroll } from './types';

// Pattern engine (opt-in, for reactive document processing)
export {
  compilePattern,
  applyPattern,
  PatternEngine,
  pattern,
  loggerPattern,
  emailExtractorPattern,
  typeIndexPattern,
} from './pattern';

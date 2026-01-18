/**
 * Core structural regular expression commands
 *
 * Based on Rob Pike's 1987 paper "Structural Regular Expressions"
 * https://doc.cat-v.org/bell_labs/structural_regexps/
 *
 * The key insight: traditional regex treats text as a flat string.
 * Structural regex treats text as nested regions that can be
 * selected and transformed compositionally.
 *
 * @module commands
 */

import type { Command, Match } from './types';

/**
 * Find all matches of a regex in text, returning detailed match information.
 *
 * @param pattern - The regex pattern to match
 * @param text - The text to search
 * @returns Array of Match objects with text, position, and capture groups
 *
 * @example
 * const matches = findMatches(/\d+/, 'a1b23c456');
 * // => [
 * //   { text: '1', start: 1, end: 2, groups: ['1'] },
 * //   { text: '23', start: 3, end: 5, groups: ['23'] },
 * //   { text: '456', start: 6, end: 9, groups: ['456'] }
 * // ]
 */
export function findMatches(pattern: RegExp, text: string): Match[] {
  const matches: Match[] = [];
  const global = new RegExp(
    pattern.source,
    pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
  );

  let match: RegExpExecArray | null;
  while ((match = global.exec(text)) !== null) {
    matches.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      groups: [...match],
    });
    // Prevent infinite loop on zero-length matches
    if (match[0].length === 0) {
      global.lastIndex++;
    }
  }
  return matches;
}

/**
 * **x command**: Extract all matches and apply a command to each.
 *
 * This is the fundamental "loop over matches" operation from Pike's paper.
 * Non-matching portions are preserved; only matches are transformed.
 *
 * @param pattern - Regex pattern to match
 * @param cmd - Command to apply to each match
 * @returns A new command that transforms input text
 *
 * @example
 * // Double all numbers
 * const double = x(/\d+/, n => String(Number(n) * 2));
 * double('a1b2c3'); // => 'a2b4c6'
 *
 * @example
 * // Replace numbers with placeholder
 * const redact = x(/\d+/, c('[NUM]'));
 * redact('SSN: 123-45-6789'); // => 'SSN: [NUM]-[NUM]-[NUM]'
 */
export function x(pattern: RegExp, cmd: Command): Command {
  return (input: string): string => {
    const matches = findMatches(pattern, input);
    if (matches.length === 0) return input;

    let result = '';
    let lastEnd = 0;

    for (const match of matches) {
      // Keep text before match
      result += input.slice(lastEnd, match.start);
      // Apply command to match and use result
      result += cmd(match.text);
      lastEnd = match.end;
    }

    // Keep text after last match
    result += input.slice(lastEnd);
    return result;
  };
}

/**
 * **y command**: Extract all non-matching portions and apply a command to each.
 *
 * The complement of `x`. Matches are preserved; non-matches are transformed.
 * Useful for transforming the "background" while keeping specific patterns intact.
 *
 * @param pattern - Regex pattern (matches are preserved)
 * @param cmd - Command to apply to non-matching portions
 * @returns A new command that transforms input text
 *
 * @example
 * // Uppercase everything except numbers
 * const shout = y(/\d+/, str => str.toUpperCase());
 * shout('hello123world'); // => 'HELLO123WORLD'
 *
 * @example
 * // Redact everything except email addresses
 * const keepEmails = y(/\S+@\S+/, () => '[REDACTED]');
 * keepEmails('Contact: john@example.com'); // => '[REDACTED] john@example.com'
 */
export function y(pattern: RegExp, cmd: Command): Command {
  return (input: string): string => {
    const matches = findMatches(pattern, input);
    if (matches.length === 0) return cmd(input);

    let result = '';
    let lastEnd = 0;

    for (const match of matches) {
      // Apply command to text before match
      if (match.start > lastEnd) {
        result += cmd(input.slice(lastEnd, match.start));
      }
      // Keep the match unchanged
      result += match.text;
      lastEnd = match.end;
    }

    // Apply command to text after last match
    if (lastEnd < input.length) {
      result += cmd(input.slice(lastEnd));
    }

    return result;
  };
}

/**
 * **g command**: Guard - run command only if pattern matches anywhere in input.
 *
 * A conditional gate. If the pattern matches, the entire input is passed
 * to the command. Otherwise, input is returned unchanged.
 *
 * @param pattern - Regex pattern to test
 * @param cmd - Command to run if pattern matches
 * @returns A new command that conditionally transforms input
 *
 * @example
 * // Alert on error logs
 * const alertErrors = g(/error/i, line => '[ALERT] ' + line);
 * alertErrors('Error: disk full'); // => '[ALERT] Error: disk full'
 * alertErrors('Info: all good');   // => 'Info: all good'
 */
export function g(pattern: RegExp, cmd: Command): Command {
  return (input: string): string => {
    if (pattern.test(input)) {
      return cmd(input);
    }
    return input;
  };
}

/**
 * **v command**: Veto - run command only if pattern does NOT match.
 *
 * The complement of `g`. Useful for filtering or skipping certain inputs.
 *
 * @param pattern - Regex pattern to test
 * @param cmd - Command to run if pattern does NOT match
 * @returns A new command that conditionally transforms input
 *
 * @example
 * // Skip comment lines
 * const skipComments = v(/^\s*#/, processLine);
 *
 * @example
 * // Process only non-empty lines
 * const skipEmpty = v(/^\s*$/, processLine);
 */
export function v(pattern: RegExp, cmd: Command): Command {
  return (input: string): string => {
    if (!pattern.test(input)) {
      return cmd(input);
    }
    return input;
  };
}

/**
 * **p command**: Print - identity function, returns input unchanged.
 *
 * Useful as a terminal command in pipelines or for debugging.
 *
 * @returns A command that returns its input unchanged
 *
 * @example
 * const identity = p();
 * identity('hello'); // => 'hello'
 *
 * @example
 * // Use with xAll to collect matches
 * const numbers = xAll(/\d+/, p());
 * numbers('a1b23c456'); // => ['1', '23', '456']
 */
export function p(): Command {
  return (input: string): string => input;
}

/**
 * **d command**: Delete - returns empty string.
 *
 * Use with `x` to remove all matches of a pattern.
 *
 * @returns A command that always returns empty string
 *
 * @example
 * // Remove all digits
 * const stripNumbers = x(/\d+/, d());
 * stripNumbers('abc123def456'); // => 'abcdef'
 *
 * @example
 * // Remove HTML tags
 * const stripTags = x(/<[^>]+>/, d());
 * stripTags('<p>Hello</p>'); // => 'Hello'
 */
export function d(): Command {
  return (): string => '';
}

/**
 * **c command**: Change - returns a constant string.
 *
 * Replace matches with a fixed value, ignoring the matched content.
 *
 * @param replacement - The constant string to return
 * @returns A command that always returns the replacement string
 *
 * @example
 * // Redact phone numbers
 * const redactPhone = x(/\d{3}-\d{4}/, c('[PHONE]'));
 * redactPhone('Call 555-1234'); // => 'Call [PHONE]'
 *
 * @example
 * // Normalize whitespace
 * const normalizeSpace = x(/\s+/, c(' '));
 * normalizeSpace('a   b\t\tc'); // => 'a b c'
 */
export function c(replacement: string): Command {
  return (): string => replacement;
}

/**
 * **s command**: Substitute - replace pattern matches with replacement string.
 *
 * Supports backreferences ($1, $2, etc.) for capture groups.
 * Unlike `x`, this uses the native regex replace for efficiency.
 *
 * @param pattern - Regex pattern to match
 * @param replacement - Replacement string (supports $1, $2, etc.)
 * @returns A command that substitutes matches
 *
 * @example
 * // Swap user@domain to domain:user
 * const swapEmail = s(/(\w+)@(\w+)/, '$2:$1');
 * swapEmail('john@acme'); // => 'acme:john'
 *
 * @example
 * // Wrap matches in tags
 * const wrapNumbers = s(/(\d+)/, '<num>$1</num>');
 * wrapNumbers('value: 42'); // => 'value: <num>42</num>'
 */
export function s(pattern: RegExp, replacement: string): Command {
  return (input: string): string => {
    const global = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
    );
    return input.replace(global, replacement);
  };
}

/**
 * **n command**: Select character range [start:end] and apply command.
 *
 * Supports negative indices (counting from end, like Python slices).
 * Text outside the range is preserved.
 *
 * @param start - Start index (0-based, negative counts from end)
 * @param end - End index (exclusive, undefined = end of string)
 * @param cmd - Command to apply to selected range
 * @returns A command that transforms the selected range
 *
 * @example
 * // Uppercase first 5 characters
 * const capsStart = n(0, 5, str => str.toUpperCase());
 * capsStart('hello world'); // => 'HELLO world'
 *
 * @example
 * // Process last 3 characters
 * const processEnd = n(-3, undefined, str => '[' + str + ']');
 * processEnd('testing'); // => 'test[ing]'
 */
export function n(start: number, end: number | undefined, cmd: Command): Command {
  return (input: string): string => {
    const len = input.length;
    const startIdx = start < 0 ? Math.max(0, len + start) : Math.min(start, len);
    const endIdx = end === undefined ? len : end < 0 ? Math.max(0, len + end) : Math.min(end, len);

    const before = input.slice(0, startIdx);
    const selected = input.slice(startIdx, endIdx);
    const after = input.slice(endIdx);

    return before + cmd(selected) + after;
  };
}

/**
 * **l command**: Select line range [start:end] and apply command.
 *
 * Lines are 0-indexed. Supports negative indices (counting from end).
 * Lines outside the range are preserved.
 *
 * @param start - Start line (0-based, negative counts from end)
 * @param end - End line (exclusive, undefined = last line)
 * @param cmd - Command to apply to selected lines
 * @returns A command that transforms the selected lines
 *
 * @example
 * // Process first 3 lines
 * const processHeader = l(0, 3, lines => lines.toUpperCase());
 *
 * @example
 * // Transform last line
 * const processFooter = l(-1, undefined, line => '-- ' + line);
 */
export function l(start: number, end: number | undefined, cmd: Command): Command {
  return (input: string): string => {
    const lines = input.split('\n');
    const len = lines.length;
    const startIdx = start < 0 ? Math.max(0, len + start) : Math.min(start, len);
    const endIdx = end === undefined ? len : end < 0 ? Math.max(0, len + end) : Math.min(end, len);

    const before = lines.slice(0, startIdx);
    const selected = lines.slice(startIdx, endIdx);
    const after = lines.slice(endIdx);

    const transformedSelected = cmd(selected.join('\n')).split('\n');

    return [...before, ...transformedSelected, ...after].join('\n');
  };
}

/**
 * Compose multiple commands into a pipeline.
 *
 * Commands are applied left-to-right. The output of each command
 * becomes the input to the next.
 *
 * @param commands - Commands to compose
 * @returns A single command that applies all commands in sequence
 *
 * @example
 * // Multi-step transformation
 * const sanitize = pipe(
 *   x(/\s+/, c(' ')),               // normalize whitespace
 *   x(/[<>]/, c('')),               // strip HTML-like chars
 *   g(/password/i, c('[REDACTED]')) // redact passwords
 * );
 */
export function pipe(...commands: Command[]): Command {
  return (input: string): string => {
    return commands.reduce((acc, cmd) => cmd(acc), input);
  };
}

/**
 * Extract all matches and collect transformed results as an array.
 *
 * Unlike `x`, this doesn't modify the original string - it returns
 * an array of all matches after applying the command.
 *
 * @param pattern - Regex pattern to match
 * @param cmd - Command to apply to each match
 * @returns A function that returns array of transformed matches
 *
 * @example
 * // Collect all numbers
 * const getNumbers = xAll(/\d+/, p());
 * getNumbers('a1b23c456'); // => ['1', '23', '456']
 *
 * @example
 * // Extract and transform
 * const getDoubled = xAll(/\d+/, num => String(Number(num) * 2));
 * getDoubled('a1b2c3'); // => ['2', '4', '6']
 */
export function xAll(pattern: RegExp, cmd: Command): (input: string) => string[] {
  return (input: string): string[] => {
    const matches = findMatches(pattern, input);
    return matches.map((m) => cmd(m.text));
  };
}

/**
 * Extract the first match only and apply command.
 *
 * If no match is found, returns the original input.
 *
 * @param pattern - Regex pattern to match
 * @param cmd - Command to apply to the first match
 * @returns A command that transforms only the first match
 *
 * @example
 * // Get first number
 * const firstNum = xFirst(/\d+/, p());
 * firstNum('a1b2c3'); // => '1'
 *
 * @example
 * // Transform first match only
 * const highlightFirst = xFirst(/error/i, str => '**' + str + '**');
 */
export function xFirst(pattern: RegExp, cmd: Command): Command {
  return (input: string): string => {
    const match = input.match(pattern);
    if (!match) return input;
    return cmd(match[0]);
  };
}

/**
 * Conditional command: if pattern matches, apply thenCmd, else apply elseCmd.
 *
 * @param pattern - Regex pattern to test
 * @param thenCmd - Command to apply if pattern matches
 * @param elseCmd - Command to apply if pattern doesn't match
 * @returns A command that conditionally transforms input
 *
 * @example
 * // Different handling based on content
 * const processLine = ifMatch(
 *   /^ERROR/,
 *   line => '[!] ' + line,
 *   line => '[ ] ' + line
 * );
 */
export function ifMatch(pattern: RegExp, thenCmd: Command, elseCmd: Command): Command {
  return (input: string): string => {
    if (pattern.test(input)) {
      return thenCmd(input);
    }
    return elseCmd(input);
  };
}

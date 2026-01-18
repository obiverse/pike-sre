/**
 * Example 01: Basic Commands
 *
 * This example demonstrates the five core Pike commands:
 * - x: extract matches, apply transformation
 * - y: extract non-matches (complement)
 * - g: guard (conditional)
 * - v: veto (inverse conditional)
 * - pipe: compose commands
 */

import { c, d, g, p, pipe, s, v, x, y } from '@obiverse/pike-sre';

// ============================================================
// x: Extract and Transform Matches
// ============================================================

// Double all numbers in text
const doubleNumbers = x(/\d+/, (n) => String(Number(n) * 2));
console.log(doubleNumbers('a1b2c3')); // => 'a2b4c6'

// Replace all digits with [NUM]
const redactNumbers = x(/\d+/, c('[NUM]'));
console.log(redactNumbers('SSN: 123-45-6789')); // => 'SSN: [NUM]-[NUM]-[NUM]'

// Remove all digits
const stripDigits = x(/\d+/, d());
console.log(stripDigits('abc123def456')); // => 'abcdef'

// ============================================================
// y: Transform Non-Matches (Complement of x)
// ============================================================

// Uppercase everything EXCEPT numbers
const shoutText = y(/\d+/, (str) => str.toUpperCase());
console.log(shoutText('hello123world')); // => 'HELLO123WORLD'

// Redact everything EXCEPT email addresses
const keepEmails = y(/\S+@\S+\.\S+/, c('[REDACTED]'));
console.log(keepEmails('Contact: john@example.com for help'));
// => '[REDACTED]john@example.com[REDACTED]'

// ============================================================
// g: Guard - Run Command If Pattern Matches
// ============================================================

// Add alert prefix if line contains 'error'
const alertErrors = g(/error/i, (line) => `[ALERT] ${line}`);
console.log(alertErrors('Error: disk full')); // => '[ALERT] Error: disk full'
console.log(alertErrors('Info: all good')); // => 'Info: all good'

// ============================================================
// v: Veto - Run Command If Pattern Does NOT Match
// ============================================================

// Process line only if it's not a comment
const processNonComment = v(/^\s*#/, (line) => `> ${line}`);
console.log(processNonComment('# This is a comment')); // => '# This is a comment'
console.log(processNonComment('This is code')); // => '> This is code'

// ============================================================
// s: Substitute with Backreferences
// ============================================================

// Swap email format: user@domain -> domain:user
const swapEmail = s(/(\w+)@(\w+)/, '$2:$1');
console.log(swapEmail('john@acme')); // => 'acme:john'

// Wrap numbers in tags
const wrapNumbers = s(/(\d+)/, '<num>$1</num>');
console.log(wrapNumbers('value: 42')); // => 'value: <num>42</num>'

// ============================================================
// pipe: Compose Multiple Commands
// ============================================================

// Multi-step text sanitization
const sanitize = pipe(
  x(/\s+/, c(' ')), // normalize whitespace
  x(/<[^>]+>/, d()), // strip HTML tags
  g(/password/i, c('[REDACTED]')), // redact if contains 'password'
);

console.log(sanitize('Hello    <b>World</b>'));
// => 'Hello World'

console.log(sanitize('My password is secret'));
// => '[REDACTED]'

// ============================================================
// Combining Commands
// ============================================================

// Complex transformation: process log lines
const processLogLine = pipe(
  v(/^#/, p()), // skip comments (return unchanged)
  g(/ERROR/, (line) => `!!! ${line}`), // highlight errors
  g(/WARN/, (line) => `? ${line}`), // highlight warnings
  x(/\d{4}-\d{2}-\d{2}/, c('[DATE]')), // redact dates
);

console.log(processLogLine('# Comment line'));
// => '# Comment line'

console.log(processLogLine('ERROR 2024-01-15: Something failed'));
// => '!!! ERROR [DATE]: Something failed'

console.log(processLogLine('INFO 2024-01-15: Normal operation'));
// => 'INFO [DATE]: Normal operation'

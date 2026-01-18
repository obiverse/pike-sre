/**
 * Example 03: Fluent API (sre Builder)
 *
 * The sre() function provides a fluent, chainable API
 * for building transformations step by step.
 */

import { extract, extractGroups, sre, tokenize, transform } from '@obiverse/pike-sre';

// ============================================================
// Basic Fluent Usage
// ============================================================

// Chain operations on text
const result1 = sre('Hello 123 World 456')
  .x(/\d+/) // focus on numbers
  .s(/\d+/, 'NUM') // replace with NUM
  .value(); // execute and get result

console.log('Basic fluent:', result1);
// => 'Hello NUM World NUM'

// Multiple chained operations
const result2 = sre('  ERROR: Connection failed at 10:30:45  ')
  .s(/^\s+|\s+$/g, '') // trim
  .g(/ERROR/) // only if contains ERROR
  .s(/(\d{2}):(\d{2}):(\d{2})/, '$1h$2m$3s') // format time
  .value();

console.log('Chained ops:', result2);
// => 'ERROR: Connection failed at 10h30m45s'

// ============================================================
// Testing and Matching
// ============================================================

const input = 'Contact: john@example.com, jane@company.org';

// Test if pattern exists
console.log('\n=== Testing ===');
console.log('Has email:', sre(input).test(/@/)); // => true
console.log('Has phone:', sre(input).test(/\d{3}-\d{4}/)); // => false

// Get all matches
console.log('\n=== Matching ===');
console.log('Emails:', sre(input).matches(/[\w.]+@[\w.]+/));
// => ['john@example.com', 'jane@company.org']

// Get match details with positions
const details = sre(input).matchDetails(/[\w.]+@[\w.]+/);
console.log('Match details:', details);
// => [{ text: 'john@example.com', start: 9, end: 25, groups: [...] }, ...]

// ============================================================
// Extract Utilities
// ============================================================

const htmlText = `
<div class="user">John Smith</div>
<div class="user">Jane Doe</div>
<span class="role">Admin</span>
`;

// Extract all matches
console.log('\n=== Extract ===');
console.log('Users:', extract(htmlText, /<div class="user">([^<]+)<\/div>/));

// Extract with capture groups
console.log('Groups:', extractGroups(htmlText, /<(\w+) class="(\w+)">([^<]+)<\/\1>/));
// => [['div', 'user', 'John Smith'], ['div', 'user', 'Jane Doe'], ...]

// ============================================================
// Transform Utility
// ============================================================

// Apply function to each match
const transformed = transform('Price: $10, $25, $100', /\$(\d+)/, (match, groups) => {
  const amount = Number.parseInt(groups[1], 10);
  return `$${(amount * 1.1).toFixed(2)}`; // 10% markup
});

console.log('\n=== Transform ===');
console.log('With markup:', transformed);
// => 'Price: $11.00, $27.50, $110.00'

// ============================================================
// Tokenize Utility
// ============================================================

const code = 'const x = 42 + "hello"';
const tokens = tokenize(code, /\s+|(\d+)|("[^"]*")|(\w+)|([+\-*/=])/);

console.log('\n=== Tokenize ===');
tokens.forEach((t) => {
  if (t.type === 'match') {
    console.log(`  ${t.text.padEnd(10)} @ ${t.start}-${t.end}`);
  }
});

// ============================================================
// Splitting
// ============================================================

const csvLine = 'john,doe,john@example.com,42';
const fields = sre(csvLine).split(/,/);

console.log('\n=== Split ===');
console.log('CSV fields:', fields);
// => ['john', 'doe', 'john@example.com', '42']

// ============================================================
// Range Selection with Fluent API
// ============================================================

// Process first 10 characters
const first10 = sre('Hello World, how are you?')
  .n(0, 10)
  .s(/o/g, '0') // replace 'o' with '0' in first 10 chars
  .value();

console.log('\n=== Range Selection ===');
console.log('First 10 modified:', first10);
// => 'Hell0 W0rld, how are you?'

// Process last 5 characters
const last5 = sre('Hello World!')
  .n(-5, undefined)
  .s(/./g, '*') // mask last 5 chars
  .value();

console.log('Last 5 masked:', last5);
// => 'Hello W*****'

// ============================================================
// Line Selection with Fluent API
// ============================================================

const multiLine = `Line 1: Header
Line 2: Content
Line 3: More content
Line 4: Footer`;

// Uppercase just the first line
const uppercaseHeader = sre(multiLine)
  .l(0, 1)
  .s(/.+/, (m) => m.toUpperCase())
  .value();

console.log('\n=== Line Selection ===');
console.log(uppercaseHeader);
// => 'LINE 1: HEADER\nLine 2: Content\n...'

// ============================================================
// Practical Example: URL Parser
// ============================================================

const url = 'https://user:pass@example.com:8080/path/to/resource?query=value#hash';

// Extract URL components using fluent API
console.log('\n=== URL Parsing ===');
console.log(
  'Protocol:',
  sre(url)
    .matches(/^(\w+):\/\//)[0]
    ?.replace('://', ''),
);
console.log('Host:', sre(url).matches(/:\/\/(?:[^@]+@)?([^:/]+)/)[0]);
console.log('Port:', sre(url).matches(/:(\d+)/)[0]);
console.log('Path:', sre(url).matches(/:\d+([^?#]+)/)[0]);
console.log('Query:', sre(url).matches(/\?([^#]+)/)[0]);
console.log('Hash:', sre(url).matches(/#(.+)$/)[0]);

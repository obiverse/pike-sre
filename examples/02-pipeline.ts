/**
 * Example 02: Building Pipelines
 *
 * Demonstrates how to compose complex transformations
 * using Pike's structural approach.
 */

import { c, d, g, p, pipe, s, v, x, xAll, y } from '@obiverse/pike-sre';

// ============================================================
// Log Processing Pipeline
// ============================================================

// Parse and transform log entries
const processLogs = pipe(
  // Remove empty lines
  v(/^\s*$/, p()),

  // Skip comment lines
  v(/^#/, p()),

  // Normalize timestamp format
  s(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/, '$1/$2/$3 $4:$5:$6'),

  // Highlight severity levels
  g(/\[ERROR\]/, (line) => `[!] ${line}`),
  g(/\[WARN\]/, (line) => `[?] ${line}`),
  g(/\[INFO\]/, (line) => `[ ] ${line}`),

  // Redact sensitive data
  x(/password=\S+/, c('password=[REDACTED]')),
  x(/token=\S+/, c('token=[REDACTED]')),
  x(/\b\d{3}-\d{2}-\d{4}\b/, c('[SSN]')),
);

const logInput = `
# Server logs - 2024-01-15
2024-01-15T10:30:45 [INFO] Server started
2024-01-15T10:31:00 [ERROR] Connection failed token=abc123secret
2024-01-15T10:32:15 [WARN] User SSN: 123-45-6789 accessed
`;

console.log('=== Processed Logs ===');
logInput.split('\n').forEach((line) => {
  const result = processLogs(line);
  if (result.trim()) console.log(result);
});

// ============================================================
// Data Extraction Pipeline
// ============================================================

// Extract structured data from unstructured text
const htmlContent = `
<div class="user-card">
  <h2>John Smith</h2>
  <p>Email: john.smith@example.com</p>
  <p>Phone: (555) 123-4567</p>
  <p>Role: Administrator</p>
</div>
<div class="user-card">
  <h2>Jane Doe</h2>
  <p>Email: jane.doe@company.org</p>
  <p>Phone: (555) 987-6543</p>
  <p>Role: User</p>
</div>
`;

// Extract all emails
const extractEmails = xAll(/[\w.-]+@[\w.-]+\.\w+/, p());
console.log('\n=== Extracted Emails ===');
console.log(extractEmails(htmlContent));
// => ['john.smith@example.com', 'jane.doe@company.org']

// Extract all phone numbers
const extractPhones = xAll(/\(\d{3}\)\s*\d{3}-\d{4}/, p());
console.log('\n=== Extracted Phones ===');
console.log(extractPhones(htmlContent));
// => ['(555) 123-4567', '(555) 987-6543']

// ============================================================
// Text Normalization Pipeline
// ============================================================

const normalizeText = pipe(
  // Multiple spaces to single space
  x(/\s+/g, c(' ')),

  // Trim quotes
  s(/^["']|["']$/g, ''),

  // Normalize dashes
  x(/[-–—]/g, c('-')),

  // Lowercase
  (str) => str.toLowerCase(),

  // Trim
  (str) => str.trim(),
);

console.log('\n=== Text Normalization ===');
console.log(normalizeText('  "Hello   WORLD—Test"  '));
// => 'hello world-test'

// ============================================================
// Conditional Processing Pipeline
// ============================================================

// Process different file types differently
const processLine = pipe(
  // JSON lines: extract value field
  g(/^\{.*"value"/, (line) => {
    const match = line.match(/"value"\s*:\s*"([^"]+)"/);
    return match ? match[1] : line;
  }),

  // CSV lines: extract second column
  g(/^[^{].*,/, (line) => {
    const parts = line.split(',');
    return parts[1]?.trim() || line;
  }),

  // Plain text: uppercase
  v(/[,{]/, (line) => line.toUpperCase()),
);

console.log('\n=== Conditional Processing ===');
console.log(processLine('{"id": 1, "value": "extracted"}'));
// => 'extracted'
console.log(processLine('id,name,email'));
// => 'name'
console.log(processLine('plain text here'));
// => 'PLAIN TEXT HERE'

// ============================================================
// Chaining Extractions
// ============================================================

// Extract, transform, and recombine
const markdown = `
# Title

This is a paragraph with **bold** and *italic* text.

- Item 1
- Item 2
- Item 3

Another paragraph with [a link](https://example.com).
`;

// Convert markdown bold/italic to HTML
const markdownToHtml = pipe(
  s(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'),
  s(/\*([^*]+)\*/g, '<em>$1</em>'),
  s(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>'),
  s(/^# (.+)$/gm, '<h1>$1</h1>'),
  s(/^- (.+)$/gm, '<li>$1</li>'),
);

console.log('\n=== Markdown to HTML ===');
console.log(markdownToHtml(markdown));

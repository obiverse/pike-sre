/**
 * Example 05: Pattern Engine (Document Processing)
 *
 * The PatternEngine provides reactive, document-oriented
 * processing using Pike's structural concepts.
 *
 * Patterns watch for documents matching a glob path,
 * apply guard/veto conditions, extract data, and emit
 * new documents via templates.
 */

import {
  PatternEngine,
  applyPattern,
  compilePattern,
  emailExtractorPattern,
  loggerPattern,
  pattern,
} from '@obiverse/pike-sre/pattern';

import type { PatternDef, Scroll } from '@obiverse/pike-sre';

// ============================================================
// Basic Pattern Usage
// ============================================================

// Define a pattern that extracts user mentions from messages
const mentionPattern: PatternDef = {
  name: 'mention-extractor',
  watch: '/messages/**', // Match any path under /messages/
  x: '@(\\w+)', // Extract @username mentions
  emit: 'mention',
  emit_path: '/mentions/${uuid}',
  template: {
    user: '${1}',
    source: '${path.1}',
    timestamp: '${uuid}',
  },
};

// Compile and apply the pattern
const compiled = compilePattern(mentionPattern);

const message: Scroll = {
  key: '/messages/channel-general/msg-123',
  type: 'message',
  data: 'Hey @john and @jane, check this out!',
};

const result = applyPattern(compiled, message);
console.log('=== Basic Pattern ===');
console.log('Input:', message);
console.log('Output:', result);

// ============================================================
// Pattern Engine
// ============================================================

const engine = new PatternEngine();

// Add multiple patterns
engine.add({
  name: 'error-alerter',
  watch: '/logs/**',
  g: 'ERROR|FATAL', // Guard: must contain ERROR or FATAL
  emit: 'alert',
  emit_path: '/alerts/${uuid}',
  template: {
    level: 'critical',
    source: '${path.1}',
    message: '${input}',
  },
});

engine.add({
  name: 'email-finder',
  watch: '/messages/**',
  x: '([\\w.-]+@[\\w.-]+\\.\\w+)', // Extract emails
  emit: 'contact',
  emit_path: '/contacts/${uuid}',
  template: {
    email: '${1}',
    found_in: '${path.0}/${path.1}',
  },
});

engine.add({
  name: 'metric-collector',
  watch: '/metrics/**',
  x: 'value=(\\d+)', // Extract numeric values
  emit: 'datapoint',
  emit_path: '/datapoints/${path.1}/${uuid}',
  template: {
    metric: '${path.1}',
    value: '${1}',
  },
});

console.log('\n=== Pattern Engine ===');
console.log('Registered patterns:', engine.list());

// Process documents
const documents: Scroll[] = [
  {
    key: '/logs/server-1',
    type: 'log',
    data: '2024-01-15 ERROR: Database connection failed',
  },
  {
    key: '/messages/support-channel',
    type: 'message',
    data: 'Contact me at help@example.com for assistance',
  },
  {
    key: '/metrics/cpu-usage',
    type: 'metric',
    data: 'host=server-1 value=85 unit=percent',
  },
  {
    key: '/logs/server-2',
    type: 'log',
    data: '2024-01-15 INFO: Request processed successfully', // No match (INFO, not ERROR)
  },
];

console.log('\nProcessing documents:');
for (const doc of documents) {
  const reactions = engine.apply(doc);
  console.log(`\n  Input: ${doc.key}`);
  if (reactions.length === 0) {
    console.log('  -> No reactions');
  } else {
    reactions.forEach((r) => {
      console.log(`  -> ${r.type}: ${r.key}`);
      console.log('     Data:', r.data);
    });
  }
}

// ============================================================
// Pattern Cascading
// ============================================================

const cascadeEngine = new PatternEngine();

// First pattern: detect errors
cascadeEngine.add({
  name: 'detect-error',
  watch: '/logs/**',
  g: 'ERROR',
  emit: 'error-detected',
  emit_path: '/errors/${uuid}',
  template: {
    raw: '${input}',
    source: '${path.1}',
  },
  then: 'parse-error', // Cascade to next pattern
});

// Second pattern: parse error details (runs on output of first)
cascadeEngine.add({
  name: 'parse-error',
  watch: '/errors/**',
  x: 'ERROR:\\s*(.+)', // Extract error message
  emit: 'parsed-error',
  emit_path: '/parsed-errors/${uuid}',
  template: {
    message: '${1}',
    severity: 'high',
  },
});

console.log('\n=== Pattern Cascading ===');
const errorLog: Scroll = {
  key: '/logs/app-server',
  type: 'log',
  data: 'ERROR: Connection timeout after 30s',
};

const cascadeResults = cascadeEngine.apply(errorLog);
console.log('Cascade results:');
cascadeResults.forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.type} at ${r.key}`);
  console.log('     Data:', r.data);
});

// ============================================================
// Built-in Pattern Helpers
// ============================================================

console.log('\n=== Built-in Patterns ===');

// Logger pattern: logs all writes
const logger = loggerPattern('/messages/**');
console.log('Logger pattern:', logger);

// Email extractor pattern
const emailExtractor = emailExtractorPattern('/documents/**');
console.log('Email extractor:', emailExtractor);

// ============================================================
// Testing Pattern Matching
// ============================================================

console.log('\n=== Pattern Testing ===');

const testDocs: Scroll[] = [
  { key: '/logs/server-1', type: 'log', data: 'ERROR: test' },
  { key: '/logs/server-2', type: 'log', data: 'INFO: ok' },
  { key: '/messages/chat', type: 'message', data: 'hello@world.com' },
  { key: '/other/path', type: 'other', data: 'no match' },
];

for (const doc of testDocs) {
  const matches = engine.wouldMatch(doc);
  console.log(`  ${doc.key}: ${matches.length > 0 ? matches.join(', ') : 'no matches'}`);
}

// ============================================================
// Pattern for Data Transformation Pipeline
// ============================================================

const transformEngine = new PatternEngine();

// CSV to JSON converter
transformEngine.add({
  name: 'csv-to-json',
  watch: '/uploads/csv/**',
  g: ',', // Must be CSV-like
  emit: 'json-record',
  emit_path: '/processed/json/${uuid}',
  template: {
    format: 'json',
    source: '${path.2}',
    raw: '${input}',
  },
});

// Sensitive data redactor
transformEngine.add({
  name: 'redact-ssn',
  watch: '/processed/**',
  x: '\\d{3}-\\d{2}-\\d{4}',
  emit: 'redacted',
  emit_path: '/redacted/${uuid}',
  template: {
    original_path: '${path.0}/${path.1}',
    redacted: true,
  },
});

console.log('\n=== Transform Pipeline ===');
const csvUpload: Scroll = {
  key: '/uploads/csv/users.csv',
  type: 'upload',
  data: 'John,Doe,123-45-6789,john@example.com',
};

const transforms = transformEngine.apply(csvUpload);
transforms.forEach((t) => {
  console.log(`  ${t.type}: ${JSON.stringify(t.data)}`);
});

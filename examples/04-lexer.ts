/**
 * Example 04: Building a Lexer/Tokenizer
 *
 * Demonstrates how to use createLexer() to build
 * a proper tokenizer for parsing structured text.
 */

import { createLexer, tokenize } from '@obiverse/pike-sre';
import type { LexToken, TokenDef } from '@obiverse/pike-sre';

// ============================================================
// Simple Expression Lexer
// ============================================================

const exprLexer = createLexer([
  { name: 'NUMBER', pattern: /\d+(?:\.\d+)?/ },
  { name: 'OPERATOR', pattern: /[+\-*/^]/ },
  { name: 'LPAREN', pattern: /\(/ },
  { name: 'RPAREN', pattern: /\)/ },
  { name: 'IDENTIFIER', pattern: /[a-zA-Z_]\w*/ },
  { name: 'WHITESPACE', pattern: /\s+/, skip: true },
]);

console.log('=== Expression Lexer ===');
const exprTokens = exprLexer('x = (3.14 * radius) + 42');
exprTokens.forEach((t) => {
  console.log(`  ${t.type.padEnd(12)} ${JSON.stringify(t.value)}`);
});

// ============================================================
// JSON-like Lexer
// ============================================================

const jsonLexer = createLexer([
  { name: 'LBRACE', pattern: /\{/ },
  { name: 'RBRACE', pattern: /\}/ },
  { name: 'LBRACKET', pattern: /\[/ },
  { name: 'RBRACKET', pattern: /\]/ },
  { name: 'COLON', pattern: /:/ },
  { name: 'COMMA', pattern: /,/ },
  { name: 'STRING', pattern: /"(?:[^"\\]|\\.)*"/ },
  { name: 'NUMBER', pattern: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/ },
  { name: 'TRUE', pattern: /true/ },
  { name: 'FALSE', pattern: /false/ },
  { name: 'NULL', pattern: /null/ },
  { name: 'WHITESPACE', pattern: /\s+/, skip: true },
]);

console.log('\n=== JSON Lexer ===');
const jsonInput = '{"name": "John", "age": 30, "active": true}';
const jsonTokens = jsonLexer(jsonInput);
jsonTokens.forEach((t) => {
  console.log(`  ${t.type.padEnd(10)} ${t.value}`);
});

// ============================================================
// SQL-like Lexer
// ============================================================

const sqlLexer = createLexer([
  { name: 'SELECT', pattern: /SELECT/i },
  { name: 'FROM', pattern: /FROM/i },
  { name: 'WHERE', pattern: /WHERE/i },
  { name: 'AND', pattern: /AND/i },
  { name: 'OR', pattern: /OR/i },
  { name: 'ORDER_BY', pattern: /ORDER\s+BY/i },
  { name: 'LIMIT', pattern: /LIMIT/i },
  { name: 'OPERATOR', pattern: /[=<>!]+|LIKE/i },
  { name: 'STRING', pattern: /'[^']*'/ },
  { name: 'NUMBER', pattern: /\d+/ },
  { name: 'IDENTIFIER', pattern: /[a-zA-Z_]\w*/ },
  { name: 'STAR', pattern: /\*/ },
  { name: 'COMMA', pattern: /,/ },
  { name: 'WHITESPACE', pattern: /\s+/, skip: true },
]);

console.log('\n=== SQL Lexer ===');
const sqlInput =
  'SELECT name, age FROM users WHERE active = true AND age > 18 ORDER BY name LIMIT 10';
const sqlTokens = sqlLexer(sqlInput);
sqlTokens.forEach((t) => {
  console.log(`  ${t.type.padEnd(12)} ${t.value}`);
});

// ============================================================
// Log Line Parser
// ============================================================

const logLexer = createLexer([
  { name: 'TIMESTAMP', pattern: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/ },
  { name: 'LEVEL', pattern: /\[(INFO|WARN|ERROR|DEBUG)\]/ },
  { name: 'IP', pattern: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/ },
  { name: 'URL', pattern: /\/[\w/.-]*/ },
  { name: 'STATUS', pattern: /\b[1-5]\d{2}\b/ },
  { name: 'MESSAGE', pattern: /[^\[\]]+/ },
  { name: 'WHITESPACE', pattern: /\s+/, skip: true },
]);

console.log('\n=== Log Lexer ===');
const logInput = '2024-01-15T10:30:45.123Z [INFO] 192.168.1.1 GET /api/users 200';
const logTokens = logLexer(logInput);
logTokens.forEach((t) => {
  console.log(`  ${t.type.padEnd(12)} ${t.value}`);
});

// ============================================================
// Markdown Inline Lexer
// ============================================================

const mdInlineLexer = createLexer([
  { name: 'BOLD', pattern: /\*\*[^*]+\*\*/ },
  { name: 'ITALIC', pattern: /\*[^*]+\*/ },
  { name: 'CODE', pattern: /`[^`]+`/ },
  { name: 'LINK', pattern: /\[[^\]]+\]\([^)]+\)/ },
  { name: 'IMAGE', pattern: /!\[[^\]]*\]\([^)]+\)/ },
  { name: 'TEXT', pattern: /[^*`\[!]+/ },
]);

console.log('\n=== Markdown Lexer ===');
const mdInput = 'This is **bold** and *italic* with `code` and [link](url)';
const mdTokens = mdInlineLexer(mdInput);
mdTokens.forEach((t) => {
  console.log(`  ${t.type.padEnd(8)} ${JSON.stringify(t.value)}`);
});

// ============================================================
// Using Tokens for Transformation
// ============================================================

function highlightCode(input: string): string {
  const tokens = exprLexer(input);
  return tokens
    .map((t) => {
      switch (t.type) {
        case 'NUMBER':
          return `\x1b[33m${t.value}\x1b[0m`; // yellow
        case 'OPERATOR':
          return `\x1b[36m${t.value}\x1b[0m`; // cyan
        case 'IDENTIFIER':
          return `\x1b[32m${t.value}\x1b[0m`; // green
        default:
          return t.value;
      }
    })
    .join('');
}

console.log('\n=== Syntax Highlighting ===');
console.log('Highlighted:', highlightCode('result = x * 2 + y'));

// ============================================================
// Error Handling in Lexer
// ============================================================

console.log('\n=== Error Handling ===');
const badInput = 'valid + @invalid + valid';
const badTokens = exprLexer(badInput);
badTokens.forEach((t) => {
  if (t.type === 'ERROR') {
    console.log(`  ERROR at ${t.start}: unexpected "${t.value}"`);
  } else {
    console.log(`  ${t.type.padEnd(12)} ${t.value}`);
  }
});

// ============================================================
// Building a Simple Calculator
// ============================================================

function evaluate(expr: string): number {
  const tokens = exprLexer(expr).filter((t) => t.type !== 'WHITESPACE');
  let pos = 0;

  function parseNumber(): number {
    const token = tokens[pos];
    if (token?.type === 'NUMBER') {
      pos++;
      return Number.parseFloat(token.value);
    }
    if (token?.type === 'LPAREN') {
      pos++; // skip (
      const result = parseAddSub();
      pos++; // skip )
      return result;
    }
    throw new Error('Expected number');
  }

  function parseMulDiv(): number {
    let left = parseNumber();
    while (tokens[pos]?.value === '*' || tokens[pos]?.value === '/') {
      const op = tokens[pos].value;
      pos++;
      const right = parseNumber();
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (tokens[pos]?.value === '+' || tokens[pos]?.value === '-') {
      const op = tokens[pos].value;
      pos++;
      const right = parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  return parseAddSub();
}

console.log('\n=== Calculator ===');
console.log('2 + 3 * 4 =', evaluate('2 + 3 * 4')); // => 14
console.log('(2 + 3) * 4 =', evaluate('(2 + 3) * 4')); // => 20
console.log('10 / 2 - 3 =', evaluate('10 / 2 - 3')); // => 2

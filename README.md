# @obiverse/pike-sre

> Pike's Structural Regular Expressions for TypeScript

[![npm version](https://img.shields.io/npm/v/@obiverse/pike-sre.svg)](https://www.npmjs.com/package/@obiverse/pike-sre)
[![CI](https://github.com/obiverse/pike-sre/actions/workflows/ci.yml/badge.svg)](https://github.com/obiverse/pike-sre/actions/workflows/ci.yml)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@obiverse/pike-sre)](https://bundlephobia.com/package/@obiverse/pike-sre)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## The Problem

Traditional regex operates on **flat strings**. You match, you replace. But text has *structure* — nested regions, hierarchical relationships, conditional transformations.

Regex gives you: `"a1b2c3".replace(/\d+/g, "X")` → `"aXbXcX"`

What if you want to:
- Transform only the non-matching portions?
- Apply different transformations conditionally?
- Compose multiple transformations into pipelines?
- Select ranges of text structurally?

## The Solution

Based on Rob Pike's 1987 paper ["Structural Regular Expressions"](https://doc.cat-v.org/bell_labs/structural_regexps/), this library treats text as **nested regions** that can be selected and transformed compositionally.

```typescript
import { x, y, g, v, pipe, c } from '@obiverse/pike-sre'

// x: extract matches, apply transformation
const double = x(/\d+/, n => String(Number(n) * 2))
double('a1b2c3')  // => 'a2b4c6'

// y: extract NON-matches (complement of x)
const shout = y(/\d+/, s => s.toUpperCase())
shout('hello123world')  // => 'HELLO123WORLD'

// g: guard - run if pattern matches
const alertErrors = g(/error/i, line => '[ALERT] ' + line)
alertErrors('Error: disk full')  // => '[ALERT] Error: disk full'
alertErrors('Info: all good')    // => 'Info: all good'

// v: veto - run if pattern does NOT match
const skipComments = v(/^#/, processLine)

// pipe: compose commands
const sanitize = pipe(
  x(/\s+/, c(' ')),                   // normalize whitespace
  x(/\d{3}-\d{2}-\d{4}/, c('[SSN]')), // redact SSNs
  g(/password/i, c('[REDACTED]'))     // redact passwords
)
```

## Installation

```bash
npm install @obiverse/pike-sre
```

```bash
pnpm add @obiverse/pike-sre
```

```bash
bun add @obiverse/pike-sre
```

## Quick Start

### Five Core Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `x(pattern, cmd)` | Transform **matches** | `x(/\d+/, n => n*2)` |
| `y(pattern, cmd)` | Transform **non-matches** | `y(/\d+/, s => s.toUpperCase())` |
| `g(pattern, cmd)` | Run if pattern **matches** | `g(/error/, alertFn)` |
| `v(pattern, cmd)` | Run if pattern **doesn't match** | `v(/^#/, process)` |
| `pipe(...cmds)` | Compose commands | `pipe(x(...), g(...))` |

### Additional Commands

| Command | Purpose |
|---------|---------|
| `c(str)` | Change - return constant string |
| `d()` | Delete - return empty string |
| `s(pattern, replacement)` | Substitute with backreferences |
| `p()` | Print - identity function |
| `n(start, end, cmd)` | Select character range |
| `l(start, end, cmd)` | Select line range |

### Fluent API

```typescript
import { sre } from '@obiverse/pike-sre'

const result = sre('Hello 123 World 456')
  .x(/\d+/)              // focus on numbers
  .s(/\d+/, 'NUM')       // replace with NUM
  .value()               // => 'Hello NUM World NUM'

// Testing
sre(input).test(/@/)      // => true/false
sre(input).matches(/\d+/) // => ['123', '456']
```

### Building a Lexer

```typescript
import { createLexer } from '@obiverse/pike-sre'

const lexer = createLexer([
  { name: 'NUMBER', pattern: /\d+/ },
  { name: 'OPERATOR', pattern: /[+\-*/]/ },
  { name: 'IDENTIFIER', pattern: /[a-z]\w*/i },
  { name: 'WHITESPACE', pattern: /\s+/, skip: true },
])

lexer('x + 42')
// => [
//   { type: 'IDENTIFIER', value: 'x', start: 0, end: 1 },
//   { type: 'OPERATOR', value: '+', start: 2, end: 3 },
//   { type: 'NUMBER', value: '42', start: 4, end: 6 }
// ]
```

## Tree-Shaking

Import only what you need:

```typescript
// Full library (~5KB gzipped)
import { x, y, g, v, pipe, sre, PatternEngine } from '@obiverse/pike-sre'

// Core only (~3KB gzipped) - no pattern engine
import { x, y, g, v, pipe, sre } from '@obiverse/pike-sre/core'

// Individual modules
import { compileGlob } from '@obiverse/pike-sre/glob'
import { PatternEngine } from '@obiverse/pike-sre/pattern'
import { substituteString } from '@obiverse/pike-sre/template'
```

## Examples

### Log Processing

```typescript
const processLog = pipe(
  v(/^#/, p()),                       // skip comments
  g(/ERROR/, line => '!!! ' + line),  // highlight errors
  x(/\d{4}-\d{2}-\d{2}/, c('[DATE]')), // redact dates
  x(/password=\S+/, c('password=[REDACTED]'))
)
```

### Data Extraction

```typescript
import { xAll, p } from '@obiverse/pike-sre'

// Extract all emails
const getEmails = xAll(/[\w.-]+@[\w.-]+\.\w+/, p())
getEmails('Contact john@example.com or jane@company.org')
// => ['john@example.com', 'jane@company.org']
```

### Text Normalization

```typescript
const normalize = pipe(
  x(/\s+/, c(' ')),        // collapse whitespace
  x(/[-–—]/, c('-')),      // normalize dashes
  s(/^\s+|\s+$/g, ''),     // trim
  str => str.toLowerCase() // lowercase
)
```

### Conditional Routing

```typescript
import { ifMatch } from '@obiverse/pike-sre'

const processLine = ifMatch(
  /^ERROR/,
  line => handleError(line),
  line => handleNormal(line)
)
```

## Pattern Engine (Advanced)

For document-oriented, reactive processing:

```typescript
import { PatternEngine } from '@obiverse/pike-sre/pattern'

const engine = new PatternEngine()

engine.add({
  name: 'email-extractor',
  watch: '/messages/**',           // glob pattern
  x: '([\\w.-]+@[\\w.-]+)',        // extract emails
  g: 'contact',                    // must contain 'contact'
  v: 'spam',                       // skip if contains 'spam'
  emit: 'extracted-email',
  emit_path: '/emails/${uuid}',
  template: { email: '${1}', source: '${path.1}' }
})

const reactions = engine.apply({
  key: '/messages/inbox/msg-1',
  type: 'message',
  data: 'Please contact support@example.com'
})
// => [{ key: '/emails/a1b2c3d4', type: 'extracted-email', data: { email: 'support@example.com', ... }}]
```

### Template Variables

| Variable | Description |
|----------|-------------|
| `${N}` | Regex capture group N (1-indexed) |
| `${path.N}` | Path segment N (0-indexed) |
| `${uuid}` | Generated unique ID |
| `${data.field}` | Field from input data |
| `${input}` | Original input string |

### Glob Patterns

| Pattern | Matches |
|---------|---------|
| `*` | Single path segment |
| `**` | Any number of segments |
| `literal` | Exact match |

```typescript
import { globMatch, compileGlob } from '@obiverse/pike-sre'

globMatch('/users/*', '/users/123')         // true
globMatch('/users/*', '/users/123/profile') // false
globMatch('/users/**', '/users/123/profile') // true
```

## API Reference

### Core Types

```typescript
// The fundamental unit - a function that transforms strings
type Command = (input: string) => string

// Match result with position info
interface Match {
  text: string
  start: number
  end: number
  groups: string[]
}
```

### All Exports

```typescript
// Commands
export { x, y, g, v, p, d, c, s, n, l, pipe, xAll, xFirst, ifMatch, findMatches }

// Fluent API
export { sre, SRE, tokenize, extract, extractGroups, transform, createLexer }

// Template utilities
export { substituteString, substituteValue, generateId, parsePath, template }

// Glob utilities
export { compileGlob, globMatch, globToRegex, extractGlobCaptures }

// Pattern engine (from '@obiverse/pike-sre/pattern')
export { PatternEngine, compilePattern, applyPattern, pattern }
```

## Why "Pike"?

Named after [Rob Pike](https://en.wikipedia.org/wiki/Rob_Pike), co-creator of Unix, Plan 9, and Go. His 1987 paper "Structural Regular Expressions" introduced the idea of treating text as structure rather than flat strings. This approach powered the `sam` and `acme` editors in Plan 9.

## Runtime Support

- Node.js 18+
- Deno
- Bun
- Modern browsers (ES2022)

Zero runtime dependencies. Pure TypeScript.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) © OBIVERSE

/**
 * Tests for pike-sre
 */

import { describe, expect, it } from 'vitest';
import {
  PatternEngine,
  applyPattern,
  c,
  // Glob
  compileGlob,
  // Pattern
  compilePattern,
  createLexer,
  d,
  extract,
  extractGlobCaptures,
  extractGroups,
  findMatches,
  g,
  generateId,
  globMatch,
  l,
  n,
  p,
  parsePath,
  pattern,
  pipe,
  s,
  // DSL
  sre,
  // Template
  substituteString,
  substituteValue,
  tokenize,
  transform,
  v,
  // Core commands
  x,
  xAll,
  y,
} from './index';

describe('Core Commands', () => {
  describe('x (extract)', () => {
    it('replaces all matches with command output', () => {
      const cmd = x(/\d+/, c('NUM'));
      expect(cmd('a1b2c3')).toBe('aNUMbNUMcNUM');
    });

    it('passes match text to command', () => {
      const cmd = x(/\d+/, (m) => `[${m}]`);
      expect(cmd('a1b23c')).toBe('a[1]b[23]c');
    });

    it('returns input unchanged when no matches', () => {
      const cmd = x(/\d+/, c('NUM'));
      expect(cmd('abc')).toBe('abc');
    });
  });

  describe('y (complement)', () => {
    it('applies command to non-matches', () => {
      const cmd = y(/\d+/, c('X'));
      expect(cmd('a1b2c')).toBe('X1X2X');
    });

    it('applies command to entire input when no matches', () => {
      const cmd = y(/\d+/, c('X'));
      expect(cmd('abc')).toBe('X');
    });
  });

  describe('g (guard)', () => {
    it('runs command when pattern matches', () => {
      const cmd = g(/error/, c('HAS_ERROR'));
      expect(cmd('error: something')).toBe('HAS_ERROR');
    });

    it('returns input unchanged when pattern does not match', () => {
      const cmd = g(/error/, c('HAS_ERROR'));
      expect(cmd('ok: success')).toBe('ok: success');
    });
  });

  describe('v (veto)', () => {
    it('runs command when pattern does NOT match', () => {
      const cmd = v(/skip/, c('KEPT'));
      expect(cmd('keep this')).toBe('KEPT');
    });

    it('returns input unchanged when pattern matches', () => {
      const cmd = v(/skip/, c('KEPT'));
      expect(cmd('skip this')).toBe('skip this');
    });
  });

  describe('s (substitute)', () => {
    it('replaces all matches with replacement', () => {
      const cmd = s(/cat/, 'dog');
      expect(cmd('cat and cat')).toBe('dog and dog');
    });

    it('supports backreferences', () => {
      const cmd = s(/(\w+)@(\w+)/, '$2:$1');
      expect(cmd('name@domain')).toBe('domain:name');
    });
  });

  describe('p, d, c', () => {
    it('p returns input unchanged', () => {
      expect(p()('hello')).toBe('hello');
    });

    it('d returns empty string', () => {
      expect(d()('hello')).toBe('');
    });

    it('c returns constant', () => {
      expect(c('world')('hello')).toBe('world');
    });
  });

  describe('n (character range)', () => {
    it('applies command to character range', () => {
      const cmd = n(0, 5, (s) => s.toUpperCase());
      expect(cmd('hello world')).toBe('HELLO world');
    });

    it('supports negative indices', () => {
      const cmd = n(-5, undefined, (s) => s.toUpperCase());
      expect(cmd('hello world')).toBe('hello WORLD');
    });
  });

  describe('l (line range)', () => {
    it('applies command to line range', () => {
      const cmd = l(0, 2, (s) => s.toUpperCase());
      expect(cmd('a\nb\nc\nd')).toBe('A\nB\nc\nd');
    });
  });

  describe('pipe', () => {
    it('composes commands left to right', () => {
      const cmd = pipe(
        g(/hello/, p()),
        s(/hello/, 'hi'),
        x(/\w+/, (w) => w.toUpperCase()),
      );
      expect(cmd('hello world')).toBe('HI WORLD');
    });

    it('short-circuits on empty', () => {
      // v(/hello/) returns input unchanged when hello matches (veto)
      // so we use g(/goodbye/) which returns input unchanged when NOT matched
      const cmd = pipe(
        g(/goodbye/, d()), // Doesn't match 'hello world', so returns unchanged
        s(/world/, 'universe'),
      );
      expect(cmd('hello world')).toBe('hello universe');

      // This one should delete because goodbye matches
      const cmd2 = pipe(g(/hello/, d()), s(/world/, 'universe'));
      expect(cmd2('hello world')).toBe('');
    });
  });
});

describe('DSL (sre)', () => {
  it('chains operations fluently', () => {
    const result = sre('hello 123 world 456').s(/\d+/, 'NUM').value();
    expect(result).toBe('hello NUM world NUM');
  });

  it('extracts matches', () => {
    const result = sre('hello 123 world 456').matches(/\d+/);
    expect(result).toEqual(['123', '456']);
  });

  it('tests patterns', () => {
    expect(sre('hello 123').test(/\d+/)).toBe(true);
    expect(sre('hello').test(/\d+/)).toBe(false);
  });

  it('splits by pattern', () => {
    const result = sre('a,b,c').split(/,/);
    expect(result).toEqual(['a', 'b', 'c']);
  });
});

describe('tokenize', () => {
  it('returns tokens with positions', () => {
    const tokens = tokenize('a1b2', /\d+/);
    expect(tokens).toEqual([
      { type: 'between', text: 'a', start: 0, end: 1 },
      { type: 'match', text: '1', groups: ['1'], start: 1, end: 2 },
      { type: 'between', text: 'b', start: 2, end: 3 },
      { type: 'match', text: '2', groups: ['2'], start: 3, end: 4 },
    ]);
  });
});

describe('createLexer', () => {
  it('creates a working lexer', () => {
    const lexer = createLexer([
      { name: 'NUMBER', pattern: /\d+/ },
      { name: 'WORD', pattern: /[a-zA-Z]+/ },
      { name: 'SPACE', pattern: /\s+/, skip: true },
    ]);
    const tokens = lexer('hello 123 world');
    expect(tokens.map((t) => ({ type: t.type, value: t.value }))).toEqual([
      { type: 'WORD', value: 'hello' },
      { type: 'NUMBER', value: '123' },
      { type: 'WORD', value: 'world' },
    ]);
  });

  it('reports unmatched text as ERROR', () => {
    const lexer = createLexer([{ name: 'WORD', pattern: /[a-z]+/ }]);
    const tokens = lexer('hello@world');
    expect(tokens.map((t) => t.type)).toEqual(['WORD', 'ERROR', 'WORD']);
  });
});

describe('Template', () => {
  describe('substituteString', () => {
    it('substitutes capture groups', () => {
      const result = substituteString('User: ${1}', { captures: ['full', 'alice'] });
      expect(result).toBe('User: alice');
    });

    it('substitutes path segments', () => {
      const result = substituteString('/out/${path.0}/${path.1}', { path: ['users', '123'] });
      expect(result).toBe('/out/users/123');
    });

    it('substitutes data fields', () => {
      const result = substituteString('Hello ${data.name}', { data: { name: 'Bob' } });
      expect(result).toBe('Hello Bob');
    });

    it('substitutes nested data fields', () => {
      const result = substituteString('${data.user.email}', {
        data: { user: { email: 'a@b.com' } },
      });
      expect(result).toBe('a@b.com');
    });

    it('generates uuid', () => {
      const result = substituteString('/items/${uuid}', {});
      expect(result).toMatch(/^\/items\/[a-f0-9]{8}$/);
    });
  });

  describe('substituteValue', () => {
    it('substitutes in nested objects', () => {
      const result = substituteValue(
        { user: '${1}', path: '/out/${path.0}' },
        { captures: ['full', 'alice'], path: ['users'] },
      );
      expect(result).toEqual({ user: 'alice', path: '/out/users' });
    });

    it('substitutes in arrays', () => {
      const result = substituteValue(['${1}', '${2}'], { captures: ['full', 'a', 'b'] });
      expect(result).toEqual(['a', 'b']);
    });
  });
});

describe('Glob', () => {
  describe('globMatch', () => {
    it('matches literal paths', () => {
      expect(globMatch('/users/123', '/users/123')).toBe(true);
      expect(globMatch('/users/123', '/users/456')).toBe(false);
    });

    it('matches single wildcard', () => {
      expect(globMatch('/users/*', '/users/123')).toBe(true);
      expect(globMatch('/users/*', '/users/123/profile')).toBe(false);
    });

    it('matches double wildcard', () => {
      expect(globMatch('/users/**', '/users/123')).toBe(true);
      expect(globMatch('/users/**', '/users/123/profile')).toBe(true);
      expect(globMatch('/users/**', '/users')).toBe(true);
      expect(globMatch('/**', '/any/deep/path')).toBe(true);
    });

    it('matches mixed patterns', () => {
      expect(globMatch('/users/*/posts/*', '/users/123/posts/456')).toBe(true);
      expect(globMatch('/users/*/posts/*', '/users/123/456')).toBe(false);
    });
  });

  describe('extractGlobCaptures', () => {
    it('extracts wildcard matches', () => {
      const caps = extractGlobCaptures('/users/*/posts/*', '/users/123/posts/456');
      expect(caps).toEqual(['123', '456']);
    });

    it('returns null on no match', () => {
      const caps = extractGlobCaptures('/users/*', '/posts/123');
      expect(caps).toBeNull();
    });
  });
});

describe('Pattern', () => {
  describe('compilePattern', () => {
    it('compiles a pattern definition', () => {
      const compiled = compilePattern({
        name: 'test',
        watch: '/users/**',
        g: 'user@v1',
        emit: 'audit@v1',
        emit_path: '/audit/${uuid}',
        template: { path: '${path.0}/${path.1}' },
      });
      expect(compiled.name).toBe('test');
      expect(compiled.watchMatcher('/users/123')).toBe(true);
      expect(compiled.g?.test('user@v1')).toBe(true);
    });
  });

  describe('applyPattern', () => {
    it('generates reaction scroll when matched', () => {
      const compiled = compilePattern({
        name: 'test',
        watch: '/users/**',
        emit: 'audit@v1',
        emit_path: '/audit/${path.1}',
        template: { user_id: '${path.1}' },
      });

      const scroll = {
        key: '/users/123',
        type: 'user@v1',
        data: { name: 'Alice' },
      };

      const reaction = applyPattern(compiled, scroll);
      expect(reaction).not.toBeNull();
      expect(reaction?.key).toBe('/audit/123');
      expect(reaction?.data).toEqual({ user_id: '123' });
    });

    it('returns null when guard fails', () => {
      const compiled = compilePattern({
        name: 'test',
        watch: '/users/**',
        g: 'admin',
        emit: 'audit@v1',
        emit_path: '/audit/${path.1}',
        template: {},
      });

      const scroll = {
        key: '/users/123',
        type: 'user@v1',
        data: { role: 'user' },
      };

      expect(applyPattern(compiled, scroll)).toBeNull();
    });

    it('returns null when veto matches', () => {
      const compiled = compilePattern({
        name: 'test',
        watch: '/users/**',
        v: 'deleted',
        emit: 'audit@v1',
        emit_path: '/audit/${path.1}',
        template: {},
      });

      const scroll = {
        key: '/users/123',
        type: 'user@v1',
        data: { status: 'deleted' },
      };

      expect(applyPattern(compiled, scroll)).toBeNull();
    });

    it('extracts captures with x', () => {
      const compiled = compilePattern({
        name: 'email-extractor',
        watch: '/**',
        x: '([a-z]+)@([a-z]+)',
        emit: 'extracted@v1',
        emit_path: '/extracted/${uuid}',
        template: { user: '${1}', domain: '${2}' },
      });

      const scroll = {
        key: '/messages/1',
        type: 'message@v1',
        data: { text: 'contact alice@example' },
      };

      const reaction = applyPattern(compiled, scroll);
      expect(reaction?.data).toEqual({ user: 'alice', domain: 'example' });
    });
  });

  describe('PatternEngine', () => {
    it('manages multiple patterns', () => {
      const engine = new PatternEngine();
      engine.add({
        name: 'p1',
        watch: '/a/**',
        emit: 'out@v1',
        emit_path: '/out/a',
        template: {},
      });
      engine.add({
        name: 'p2',
        watch: '/b/**',
        emit: 'out@v1',
        emit_path: '/out/b',
        template: {},
      });

      expect(engine.list()).toEqual(['p1', 'p2']);
      expect(engine.size).toBe(2);
    });

    it('applies matching patterns', () => {
      const engine = new PatternEngine();
      engine.add({
        name: 'logger',
        watch: '/**',
        emit: 'log@v1',
        emit_path: '/logs/${path.0}',
        template: { logged: true },
      });

      const reactions = engine.apply({
        key: '/users/123',
        type: 'user@v1',
        data: {},
      });

      expect(reactions.length).toBe(1);
      expect(reactions[0].key).toBe('/logs/users');
    });
  });
});

describe('Real-world Examples', () => {
  it('Pike example: change n to m everywhere', () => {
    const cmd = x(/n/, c('m'));
    expect(cmd('noun')).toBe('moum');
  });

  it('Pike example: print lines containing rob but not robot', () => {
    const input = 'rob pike\nrobot arm\nrob smith';
    const result = sre(input)
      .split(/\n/)
      .filter((line) => /rob/.test(line) && !/robot/.test(line));
    // Note: filter is native JS, showing integration
    expect(result).toEqual(['rob pike', 'rob smith']);
  });

  it('transforms code identifiers', () => {
    const code = 'let userName = getUserName();';
    // Change camelCase to snake_case
    const result = transform(code, /[a-z][A-Z]/g, (m) => `${m[0]}_${m[1].toLowerCase()}`);
    expect(result).toBe('let user_name = get_user_name();');
  });

  it('extracts structured data', () => {
    const log = '[ERROR] 2024-01-15 Connection failed\n[INFO] 2024-01-15 Retry';
    const entries = extractGroups(log, /\[(\w+)\] (\d{4}-\d{2}-\d{2}) (.+)/g);
    expect(entries).toEqual([
      ['[ERROR] 2024-01-15 Connection failed', 'ERROR', '2024-01-15', 'Connection failed'],
      ['[INFO] 2024-01-15 Retry', 'INFO', '2024-01-15', 'Retry'],
    ]);
  });

  it('builds a simple calculator lexer', () => {
    const lexer = createLexer([
      { name: 'NUM', pattern: /\d+(\.\d+)?/ },
      { name: 'OP', pattern: /[+\-*/]/ },
      { name: 'LPAREN', pattern: /\(/ },
      { name: 'RPAREN', pattern: /\)/ },
      { name: 'WS', pattern: /\s+/, skip: true },
    ]);

    const tokens = lexer('(1 + 2) * 3.14');
    expect(tokens.map((t) => t.type)).toEqual([
      'LPAREN',
      'NUM',
      'OP',
      'NUM',
      'RPAREN',
      'OP',
      'NUM',
    ]);
  });
});

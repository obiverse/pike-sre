/**
 * Template substitution for pattern outputs
 *
 * Supports:
 * - ${N} - regex capture groups (1-indexed)
 * - ${path.N} - path segments (0-indexed)
 * - ${uuid} - generated unique ID
 * - ${data.field} - data field access (supports nested: ${data.user.name})
 * - ${input} - original input
 */

/**
 * Context for template substitution
 */
export interface TemplateContext {
  /** Regex capture groups (index 0 is full match) */
  captures?: string[];
  /** Path segments */
  path?: string[];
  /** Arbitrary data object */
  data?: Record<string, unknown>;
  /** Original input string */
  input?: string;
}

/**
 * Generate a short unique ID (8 hex chars based on timestamp + random)
 */
export function generateId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 0xffff);
  // Use >>> 0 to convert to unsigned 32-bit integer (ensures no negative)
  return ((timestamp ^ random) >>> 0).toString(16).padStart(8, '0');
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Substitute template variables in a string
 */
export function substituteString(template: string, ctx: TemplateContext): string {
  let result = template;

  // ${N} - capture groups (1-indexed in template, but captures[0] is full match)
  if (ctx.captures) {
    for (let i = 0; i < ctx.captures.length; i++) {
      // ${1} maps to captures[1], etc.
      result = result.replace(new RegExp(`\\$\\{${i}\\}`, 'g'), ctx.captures[i] ?? '');
    }
  }

  // ${path.N} - path segments
  if (ctx.path) {
    for (let i = 0; i < ctx.path.length; i++) {
      result = result.replace(new RegExp(`\\$\\{path\\.${i}\\}`, 'g'), ctx.path[i] ?? '');
    }
  }

  // ${uuid} - generate unique ID
  result = result.replace(/\$\{uuid\}/g, generateId());

  // ${input} - original input
  if (ctx.input !== undefined) {
    result = result.replace(/\$\{input\}/g, ctx.input);
  }

  // ${data.field} - data fields with nested support
  if (ctx.data) {
    result = result.replace(/\$\{data\.([a-zA-Z0-9_.]+)\}/g, (_, path: string) => {
      const value = getNestedValue(ctx.data!, path);
      if (value === undefined || value === null) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      return JSON.stringify(value);
    });
  }

  return result;
}

/**
 * Recursively substitute template variables in a value (string, object, or array)
 */
export function substituteValue(template: unknown, ctx: TemplateContext): unknown {
  if (typeof template === 'string') {
    return substituteString(template, ctx);
  }

  if (Array.isArray(template)) {
    return template.map((item) => substituteValue(item, ctx));
  }

  if (template !== null && typeof template === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(template)) {
      const newKey = substituteString(key, ctx);
      result[newKey] = substituteValue(value, ctx);
    }
    return result;
  }

  // Numbers, booleans, null - return as-is
  return template;
}

/**
 * Create a template command that substitutes variables
 */
export function template(
  tmpl: string,
  ctx: Partial<TemplateContext> = {},
): (input: string) => string {
  return (input: string): string => {
    return substituteString(tmpl, { ...ctx, input });
  };
}

/**
 * Extract captures from a regex match and add to context
 */
export function withCaptures(pattern: RegExp, input: string): string[] {
  const match = input.match(pattern);
  if (!match) return [];
  return [...match];
}

/**
 * Parse a path into segments
 */
export function parsePath(path: string): string[] {
  return path.split('/').filter((s) => s.length > 0);
}

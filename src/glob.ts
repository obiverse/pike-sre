/**
 * Glob pattern matching for paths
 *
 * Supports:
 * - * matches a single path segment
 * - ** matches any number of segments (including zero)
 * - Literal segments match exactly
 */

/**
 * Compiled glob pattern for efficient matching
 */
export interface GlobPattern {
  /** Original pattern string */
  pattern: string;
  /** Compiled segments */
  segments: GlobSegment[];
  /** Test if a path matches this pattern */
  matches: (path: string) => boolean;
}

type GlobSegment =
  | { type: 'literal'; value: string }
  | { type: 'single' } // *
  | { type: 'double' }; // **

/**
 * Parse a glob pattern into segments
 */
function parseGlobSegments(pattern: string): GlobSegment[] {
  const parts = pattern.split('/').filter((s) => s.length > 0);
  return parts.map((part) => {
    if (part === '**') return { type: 'double' };
    if (part === '*') return { type: 'single' };
    return { type: 'literal', value: part };
  });
}

/**
 * Match path segments against glob segments
 */
function matchSegments(glob: GlobSegment[], path: string[], gi = 0, pi = 0): boolean {
  // Base case: consumed all glob segments
  if (gi >= glob.length) {
    return pi >= path.length;
  }

  const segment = glob[gi];

  // ** matches zero or more segments
  if (segment.type === 'double') {
    // Try matching 0, 1, 2, ... path segments
    for (let skip = 0; skip <= path.length - pi; skip++) {
      if (matchSegments(glob, path, gi + 1, pi + skip)) {
        return true;
      }
    }
    return false;
  }

  // Need at least one path segment for * or literal
  if (pi >= path.length) {
    return false;
  }

  // * matches exactly one segment
  if (segment.type === 'single') {
    return matchSegments(glob, path, gi + 1, pi + 1);
  }

  // Literal must match exactly
  if (segment.type === 'literal') {
    if (segment.value !== path[pi]) {
      return false;
    }
    return matchSegments(glob, path, gi + 1, pi + 1);
  }

  return false;
}

/**
 * Compile a glob pattern for efficient reuse
 */
export function compileGlob(pattern: string): GlobPattern {
  const segments = parseGlobSegments(pattern);

  return {
    pattern,
    segments,
    matches: (path: string): boolean => {
      const pathParts = path.split('/').filter((s) => s.length > 0);
      return matchSegments(segments, pathParts);
    },
  };
}

/**
 * Test if a path matches a glob pattern (one-shot, no compilation)
 */
export function globMatch(pattern: string, path: string): boolean {
  return compileGlob(pattern).matches(path);
}

/**
 * Convert a glob pattern to a regular expression
 */
export function globToRegex(pattern: string): RegExp {
  // Escape regex special chars except * and /
  const regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\0DOUBLE\0')
    .replace(/\*/g, '[^/]+')
    .replace(/\0DOUBLE\0/g, '.*');

  // Ensure pattern matches entire path
  return new RegExp(`^/?${regex}/?$`);
}

/**
 * Extract path segments that match glob wildcards
 */
export function extractGlobCaptures(pattern: string, path: string): string[] | null {
  const segments = parseGlobSegments(pattern);
  const pathParts = path.split('/').filter((s) => s.length > 0);
  const captures: string[] = [];

  function extract(gi: number, pi: number): boolean {
    if (gi >= segments.length) {
      return pi >= pathParts.length;
    }

    const segment = segments[gi];

    if (segment.type === 'double') {
      // Try matching 0, 1, 2, ... path segments
      for (let skip = 0; skip <= pathParts.length - pi; skip++) {
        const tempCaptures = pathParts.slice(pi, pi + skip);
        if (extract(gi + 1, pi + skip)) {
          captures.push(...tempCaptures);
          return true;
        }
      }
      return false;
    }

    if (pi >= pathParts.length) {
      return false;
    }

    if (segment.type === 'single') {
      captures.push(pathParts[pi]);
      return extract(gi + 1, pi + 1);
    }

    if (segment.type === 'literal') {
      if (segment.value !== pathParts[pi]) {
        return false;
      }
      return extract(gi + 1, pi + 1);
    }

    return false;
  }

  if (extract(0, 0)) {
    return captures;
  }
  return null;
}

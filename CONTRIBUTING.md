# Contributing to @obiverse/pike-sre

Thank you for considering contributing to pike-sre!

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/obiverse/pike-sre.git
   cd pike-sre
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Run tests:
   ```bash
   bun test
   ```

4. Run linting:
   ```bash
   bun run lint
   ```

5. Build:
   ```bash
   bun run build
   ```

## Project Structure

```
src/
├── index.ts      # Main entry point (exports everything)
├── core.ts       # Pure exports (no pattern engine)
├── types.ts      # Type definitions
├── commands.ts   # Pike's core commands (x, y, g, v, etc.)
├── dsl.ts        # Fluent SRE class and utilities
├── pattern.ts    # Pattern engine for document processing
├── template.ts   # Template substitution
├── glob.ts       # Path glob matching
└── *.test.ts     # Tests (co-located)

examples/
├── 01-basic.ts
├── 02-pipeline.ts
├── 03-fluent.ts
├── 04-lexer.ts
└── 05-patterns.ts
```

## Making Changes

1. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes, ensuring:
   - All tests pass: `bun test`
   - Linting passes: `bun run lint`
   - Types check: `bun run typecheck`
   - Build succeeds: `bun run build`

3. Add tests for new functionality

4. Update documentation if needed

5. Create a changeset:
   ```bash
   bunx changeset
   ```

6. Submit a pull request

## Code Style

- We use [Biome](https://biomejs.dev/) for linting and formatting
- Run `bun run lint:fix` to auto-fix issues
- Use single quotes for strings
- Use semicolons
- 2-space indentation

## Testing

- Tests are co-located with source files (`*.test.ts`)
- Use [Vitest](https://vitest.dev/) for testing
- Aim for >80% coverage on new code
- Run `bun run test:coverage` to check coverage

## Commit Messages

We use conventional commits:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `test:` test changes
- `refactor:` code refactoring
- `chore:` maintenance tasks

## Pull Request Process

1. Ensure all checks pass
2. Update README.md if adding new features
3. Add changeset for version bumping
4. Request review from maintainers

## Questions?

Open an issue for discussion before making large changes.

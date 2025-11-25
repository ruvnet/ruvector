# Contributing to Genomic Vector Analysis

Thank you for your interest in contributing to Genomic Vector Analysis! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

---

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before contributing.

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, gender identity, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, or nationality.

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: >= 18.0.0 (LTS recommended)
- **npm**: >= 9.0.0 or **pnpm**: >= 8.0.0
- **Git**: >= 2.30.0
- **Rust** (optional, for WASM development): >= 1.70.0

### Fork and Clone

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ruvector.git
   cd ruvector/packages/genomic-vector-analysis
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ruvnet/ruvector.git
   ```

### Install Dependencies

```bash
# Using npm
npm install

# Or using pnpm
pnpm install
```

### Verify Setup

```bash
# Run tests to verify everything works
npm test

# Run linter
npm run lint

# Build the project
npm run build
```

If all commands complete successfully, you're ready to start contributing!

---

## Development Process

### 1. Find or Create an Issue

Before starting work:

- **Check existing issues**: Look for open issues that interest you
- **Create new issues**: If reporting a bug or proposing a feature, create an issue first
- **Discuss major changes**: For significant changes, discuss in an issue before coding

**Issue Labels:**
- `good first issue`: Great for newcomers
- `help wanted`: Community contributions welcome
- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements

### 2. Create a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-number-description
```

**Branch Naming Conventions:**
- `feature/feature-name` - New features
- `fix/issue-number-description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### 3. Make Changes

- Write clean, maintainable code
- Follow coding standards (see below)
- Add tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

### 4. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Format: <type>(<scope>): <description>

git commit -m "feat(embeddings): add protein sequence embedding support"
git commit -m "fix(search): resolve HNSW index corruption issue"
git commit -m "docs(api): update VectorDatabase API reference"
git commit -m "test(integration): add variant annotation test cases"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

---

## Pull Request Process

### Before Submitting

Ensure your PR meets these requirements:

- [ ] All tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Code coverage is maintained or improved
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated (for significant changes)
- [ ] Commit messages follow conventions

### Submitting a Pull Request

1. **Navigate** to your fork on GitHub
2. **Click** "New Pull Request"
3. **Select** your branch to compare against `ruvnet/ruvector:main`
4. **Fill out** the PR template:
   - Clear title describing the change
   - Detailed description of what and why
   - Link to related issues
   - Screenshots (if UI changes)
   - Testing instructions

### PR Template

```markdown
## Description
Brief description of changes and their purpose.

## Related Issues
Closes #123
Related to #456

## Changes Made
- Added feature X
- Fixed bug Y
- Updated documentation for Z

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] Performance benchmarks run (if applicable)

## Documentation
- [ ] README updated
- [ ] API documentation updated
- [ ] Tutorial/example added (if applicable)

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review performed
- [ ] Comments added for complex code
- [ ] No new warnings generated
- [ ] Tests pass locally
```

### Review Process

1. **Automated checks** run on your PR (tests, linting, type checking)
2. **Maintainers review** your code
3. **Feedback addressed** through additional commits
4. **Approval** from at least one maintainer required
5. **Merge** by maintainer once approved

**Review Timeline:**
- Initial response: Within 3 business days
- Full review: Within 7 business days
- Complex PRs may take longer

---

## Coding Standards

### TypeScript Style Guide

We follow standard TypeScript best practices with some project-specific conventions:

#### General Principles

- **Type Safety**: Avoid `any`, use specific types or generics
- **Immutability**: Prefer `const` over `let`, avoid mutations
- **Pure Functions**: Functions should be pure when possible
- **Single Responsibility**: Each function/class should do one thing well
- **DRY**: Don't Repeat Yourself

#### Naming Conventions

```typescript
// Classes: PascalCase
class VectorDatabase { }

// Interfaces: PascalCase with 'I' prefix (for implementation interfaces)
interface IEmbedding { }

// Types: PascalCase
type SearchOptions = { ... };

// Functions/Methods: camelCase
function searchVectors() { }

// Constants: UPPER_SNAKE_CASE
const MAX_VECTOR_DIMENSION = 2048;

// Private members: camelCase with underscore prefix
private _internalState: any;
```

#### Code Structure

```typescript
// ✅ Good: Clear type definitions
interface SearchOptions {
  top?: number;
  filters?: Record<string, any>;
  includeVectors?: boolean;
}

async function search(
  query: Float32Array,
  options: SearchOptions = {}
): Promise<VectorSearchResult[]> {
  const { top = 10, filters = {}, includeVectors = false } = options;
  // Implementation
}

// ❌ Bad: Unclear types, poor structure
async function search(query: any, options?: any): Promise<any> {
  // Implementation
}
```

#### Error Handling

```typescript
// ✅ Good: Specific error types, clear messages
class VectorDatabaseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'VectorDatabaseError';
  }
}

if (dimensions < 1 || dimensions > 2048) {
  throw new VectorDatabaseError(
    `Invalid dimensions: ${dimensions}. Must be between 1 and 2048.`,
    'INVALID_DIMENSIONS'
  );
}

// ❌ Bad: Generic errors, unclear messages
if (dimensions < 1 || dimensions > 2048) {
  throw new Error('Bad dimensions');
}
```

### Rust Style Guide (for WASM modules)

Follow standard Rust conventions:

```rust
// Use rustfmt for formatting
cargo fmt

// Follow Clippy suggestions
cargo clippy

// Document public APIs
/// Calculates k-mer hash for DNA sequence
///
/// # Arguments
/// * `sequence` - DNA sequence string
/// * `k` - K-mer length
///
/// # Returns
/// Vector of k-mer hashes
pub fn calculate_kmer_hash(sequence: &str, k: usize) -> Vec<u64> {
    // Implementation
}
```

---

## Testing Guidelines

### Test Coverage Requirements

- **Minimum coverage**: 80% for statements, branches, functions, and lines
- **New features**: Must include tests covering all code paths
- **Bug fixes**: Must include regression test

### Test Organization

```
tests/
├── unit/                    # Fast, isolated tests
│   ├── encoding.test.ts
│   ├── indexing.test.ts
│   └── quantization.test.ts
├── integration/             # End-to-end workflows
│   └── variant-annotation.test.ts
├── performance/             # Benchmarks
│   └── benchmarks.test.ts
└── fixtures/                # Test data
    └── mock-data.ts
```

### Writing Tests

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { VectorDatabase, KmerEmbedding } from '../src';

describe('VectorDatabase', () => {
  let db: VectorDatabase;

  beforeEach(() => {
    db = new VectorDatabase({
      embedding: new KmerEmbedding({ k: 7, dimensions: 128 }),
      indexType: 'hnsw'
    });
  });

  describe('search', () => {
    it('should return top-k similar vectors', async () => {
      // Arrange
      await db.add({ id: 'v1', data: 'ATCGATCG', metadata: {} });
      await db.add({ id: 'v2', data: 'ATCGAACG', metadata: {} });

      // Act
      const results = await db.search('ATCGATCG', { top: 2 });

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('v1');
      expect(results[0].score).toBeGreaterThan(0.9);
    });

    it('should handle empty database gracefully', async () => {
      const results = await db.search('ATCG', { top: 10 });
      expect(results).toHaveLength(0);
    });

    it('should apply metadata filters correctly', async () => {
      await db.add({ id: 'v1', data: 'ATCG', metadata: { gene: 'BRCA1' } });
      await db.add({ id: 'v2', data: 'ATCG', metadata: { gene: 'TP53' } });

      const results = await db.search('ATCG', {
        top: 10,
        filters: { gene: 'BRCA1' }
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('v1');
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:performance

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests with debugging
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Performance Testing

For performance-critical code, add benchmarks:

```typescript
import { describe, it } from '@jest/globals';
import { performance } from 'perf_hooks';

describe('Performance Benchmarks', () => {
  it('should embed 1000 sequences in under 5 seconds', async () => {
    const embedding = new KmerEmbedding({ k: 7, dimensions: 128 });
    const sequences = generateRandomSequences(1000, 100);

    const start = performance.now();
    await embedding.embedBatch(sequences);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5000);
    console.log(`Embedded 1000 sequences in ${duration.toFixed(2)}ms`);
  });
});
```

---

## Documentation

### Code Documentation

Use JSDoc/TSDoc for all public APIs:

```typescript
/**
 * Searches for vectors similar to the query vector.
 *
 * @param query - Query vector or data to embed
 * @param options - Search configuration options
 * @returns Promise resolving to array of search results
 *
 * @example
 * ```typescript
 * const results = await db.search('ATCGATCG', {
 *   top: 10,
 *   filters: { gene: 'BRCA1' }
 * });
 * ```
 *
 * @throws {VectorDatabaseError} If query is invalid
 */
async search(
  query: Query,
  options?: SearchOptions
): Promise<VectorSearchResult[]> {
  // Implementation
}
```

### README Updates

Update README.md when adding:
- New features
- API changes
- Configuration options
- Performance improvements

### Tutorials

Consider adding tutorials for:
- Complex features
- Common use cases
- Integration patterns

Place tutorials in `docs/tutorials/` with clear naming:
- `01-installation.md`
- `02-first-database.md`
- etc.

---

## Community

### Getting Help

- **GitHub Discussions**: For questions and discussions
- **GitHub Issues**: For bug reports and feature requests
- **Email**: support@ruvector.dev for private inquiries

### Staying Updated

- **Watch** the repository for notifications
- **Star** the project to show support
- **Follow** [@ruvnet](https://twitter.com/ruvnet) on Twitter

### Recognition

Contributors are recognized in:
- CHANGELOG.md for their contributions
- GitHub contributors page
- Project documentation

---

## License

By contributing to Genomic Vector Analysis, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Genomic Vector Analysis! Your efforts help advance precision medicine and genomic research. 🧬

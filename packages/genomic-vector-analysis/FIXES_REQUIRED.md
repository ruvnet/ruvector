# Critical Fixes Required for Production

**Status:** 🔴 BLOCKING ISSUES - Cannot deploy until resolved

This document lists the specific fixes required to make the genomic-vector-analysis package production-ready.

---

## 🚨 CRITICAL BLOCKERS (Fix immediately)

### 1. Add Missing Dependency: zod

**Issue:** TypeScript compilation fails because `zod` is not installed.

**Fix:**
```bash
npm install --save zod
```

**Files Affected:**
- `src/types/index.ts` (line 1: `import { z } from 'zod'`)

**Verification:**
```bash
npm run build  # Should proceed past zod error
```

---

### 2. Fix Missing Type Exports (38 types)

**Issue:** `src/index.ts` tries to export types that don't exist in `src/types/index.ts`

**Missing Type Exports:**

Add these to `src/types/index.ts`:

```typescript
// Reinforcement Learning Types
export interface RLConfig {
  learningRate: number;
  discountFactor: number;
  explorationRate: number;
  replayBufferSize?: number;
}

export interface State {
  [key: string]: any;
}

export interface IndexParams {
  efConstruction?: number;
  M?: number;
  metric?: VectorMetric;
  quantization?: Quantization;
}

export interface Action {
  type: string;
  params: IndexParams;
}

export interface Experience {
  state: State;
  action: Action;
  reward: number;
  nextState: State;
  done: boolean;
}

export interface QValue {
  state: State;
  action: Action;
  value: number;
}

export interface PolicyGradientConfig {
  learningRate: number;
  gamma: number;
  entropyCoeff?: number;
}

export interface BanditArm {
  id: string;
  config: IndexParams;
  pulls: number;
  totalReward: number;
  avgReward: number;
}

// Transfer Learning Types
export interface PreTrainedModel {
  id: string;
  name: string;
  description?: string;
  domain: string;
  dimensions: number;
  weights: Float32Array | number[];
  metadata?: Record<string, any>;
}

export interface FineTuningConfig {
  learningRate: number;
  epochs: number;
  batchSize?: number;
  validationSplit?: number;
  earlyStopping?: boolean;
  patience?: number;
}

export interface DomainAdaptationConfig {
  method: 'feature-based' | 'instance-based' | 'parameter-based';
  lambda?: number;
  iterations?: number;
}

export interface FewShotConfig {
  nWay: number;
  kShot: number;
  querySize?: number;
  episodes?: number;
}

export interface TrainingMetrics {
  loss: number;
  accuracy: number;
  epoch: number;
  timestamp: number;
}

export interface DomainStatistics {
  mean: number[];
  std: number[];
  sampleCount: number;
}

// Federated Learning Types
export interface FederatedConfig {
  rounds: number;
  minClients: number;
  clientFraction: number;
  localEpochs: number;
  serverLearningRate?: number;
}

export interface Institution {
  id: string;
  name: string;
  dataSize: number;
  modelVersion?: number;
}

export interface LocalUpdate {
  institutionId: string;
  weights: number[];
  dataSize: number;
  loss: number;
  round: number;
}

export interface GlobalModel {
  weights: number[];
  round: number;
  participatingClients: number;
  avgLoss: number;
}

export interface PrivacyAccountant {
  epsilon: number;
  delta: number;
  mechanism: string;
}

export interface SecureAggregationConfig {
  threshold: number;
  noiseScale?: number;
}

export interface HomomorphicEncryptionConfig {
  keySize: number;
  scheme: 'paillier' | 'ckks' | 'bfv';
}

// Meta-Learning Types
export interface HyperparameterSpace {
  [param: string]: {
    type: 'int' | 'float' | 'categorical';
    min?: number;
    max?: number;
    values?: any[];
  };
}

export interface HyperparameterConfig {
  efConstruction?: number;
  M?: number;
  quantization?: Quantization;
  kmerSize?: number;
  [key: string]: any;
}

export interface TrialResult {
  id: string;
  config: HyperparameterConfig;
  score: number;
  metrics: Record<string, number>;
  timestamp: number;
}

export interface AdaptiveEmbeddingConfig {
  baseDimensions: number;
  adaptationRate: number;
  importanceThreshold?: number;
}

export interface QuantizationStrategy {
  method: Quantization;
  bits?: number;
  centroids?: number;
  trainable?: boolean;
}

export interface HNSWTuningConfig {
  searchSpace: HyperparameterSpace;
  maxTrials: number;
  metric: string;
}

// Explainable AI Types
export interface SHAPValue {
  feature: string;
  value: number;
  baseValue: number;
  contribution: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
}

export interface AttentionWeights {
  layer: number;
  head: number;
  weights: number[][];
  tokens: string[];
}

export interface CounterfactualExplanation {
  original: any;
  counterfactual: any;
  changes: Record<string, any>;
  distance: number;
}

export interface ExplanationContext {
  method: 'shap' | 'attention' | 'importance' | 'counterfactual';
  query: any;
  results: any[];
  timestamp: number;
}

// Continuous Learning Types
export interface OnlineLearningConfig {
  bufferSize: number;
  updateFrequency: number;
  forgettingFactor?: number;
}

export interface ModelVersion {
  id: string;
  version: number;
  timestamp: number;
  metrics: TrainingMetrics;
  checkpoint: any;
}

export interface IncrementalUpdate {
  newVectors: Vector[];
  deletedIds: string[];
  updatedVectors: Vector[];
  timestamp: number;
}

export interface ForgettingMetrics {
  oldTaskAccuracy: number[];
  newTaskAccuracy: number;
  forgettingRate: number;
}

export interface ReplayBuffer {
  size: number;
  data: any[];
  strategy: 'random' | 'importance' | 'diversity';
}
```

**Verification:**
```bash
npm run typecheck  # Should have fewer errors
```

---

### 3. Fix WASM Module References

**Issue:** Code references WASM module that doesn't exist.

**Option A: Build WASM (Recommended)**

Add build script to `package.json`:
```json
{
  "scripts": {
    "build:wasm": "cd src-rust && wasm-pack build --target bundler --out-dir ../wasm",
    "prebuild": "npm run build:wasm",
    "build": "tsc"
  }
}
```

Install wasm-pack:
```bash
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

Build WASM:
```bash
npm run build:wasm
```

**Option B: Make WASM Optional (Quick Fix)**

Edit `src/core/VectorDatabase.ts` and `src/embeddings/KmerEmbedding.ts`:

```typescript
// Old:
import * as wasm from '../../wasm/genomic_vector_wasm';

// New:
let wasm: any;
try {
  wasm = await import('../../wasm/genomic_vector_wasm');
} catch (error) {
  console.warn('WASM module not available, using JavaScript fallback');
  wasm = null;
}
```

Then check for `wasm` before using:
```typescript
if (wasm && this.config.useWasm) {
  // Use WASM
} else {
  // Use JavaScript fallback
}
```

**Verification:**
```bash
npm run build  # Should compile
```

---

### 4. Fix Jest Configuration

**Issue:** Jest has configuration errors.

**Fix `jest.config.js`:**

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],

  // Fix: coverageThresholds → coverageThreshold
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],

  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Move testTimeout to root
  testTimeout: 30000,

  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },

  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  transform: {
    '^.+\\.ts$': ['ts-jest', {
      isolatedModules: true,
    }],
  },

  // Remove testTimeout from projects
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.test.ts'],
    },
    {
      displayName: 'validation',
      testMatch: ['<rootDir>/tests/validation/**/*.test.ts'],
    },
  ],

  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
    [
      'jest-html-reporter',
      {
        pageTitle: 'Genomic Vector Analysis Test Report',
        outputPath: './test-results/index.html',
        includeFailureMsg: true,
        includeConsoleLog: true,
        sort: 'status',
      },
    ],
  ],
};
```

**Verification:**
```bash
npm test  # Should not show config warnings
```

---

### 5. Fix TypeScript Type Errors

**Issue:** Multiple type safety violations.

**Fix `src/core/VectorDatabase.ts`:**

```typescript
// Line 187: Fix type predicate
const isValidResult = (
  r: VectorSearchResult | null
): r is VectorSearchResult & { metadata: Record<string, any> } => {
  return r !== null && r.metadata !== undefined;
};

// Line 188: Fix null checks
const rerankResults = searchResults
  .filter(isValidResult)
  .sort((a, b) => {
    if (!b || !a) return 0;
    return (b.metadata?.score || 0) - (a.metadata?.score || 0);
  })
  .filter((r): r is VectorSearchResult => r !== null)
  .slice(0, options.k);

return rerankResults;
```

**Fix unused variables:**

Option 1 - Use the variables or remove them
Option 2 - Add to tsconfig.json:
```json
{
  "compilerOptions": {
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}
```

**Verification:**
```bash
npm run typecheck  # Should show 0 errors
```

---

## ⚠️ HIGH PRIORITY (Fix before production)

### 6. Update Deprecated Dependencies

**Fix `package.json`:**
```json
{
  "devDependencies": {
    "eslint": "^9.0.0",
    "glob": "^10.0.0",
    "rimraf": "^5.0.0"
  }
}
```

Then run:
```bash
npm install
npm audit fix
```

---

### 7. Remove Invalid dashmap Dependency

**Already Fixed:** ✅

The `dashmap` dependency was removed from package.json (it's a Rust crate, not npm).

---

## 📋 MEDIUM PRIORITY (Quality improvements)

### 8. Clean Up Unused Imports and Variables

Search and fix:
```bash
# Find unused imports
grep -r "error TS6133" build.log

# Fix or suppress each one
```

### 9. Add Missing Error Handling

Review and add try-catch blocks in:
- `src/core/VectorDatabase.ts`
- `src/embeddings/KmerEmbedding.ts`
- `src/learning/*.ts`

### 10. Document WASM Setup

Add to README.md:
```markdown
## Building WASM Module

### Prerequisites
- Rust toolchain
- wasm-pack

### Build Steps
\`\`\`bash
# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build WASM module
npm run build:wasm

# Build complete package
npm run build
\`\`\`
```

---

## Complete Fix Workflow

### Step-by-Step Fix Process

```bash
# 1. Add missing dependency
npm install --save zod

# 2. Fix type exports
# (Manually add types from section 2 above to src/types/index.ts)

# 3. Fix WASM references
# (Choose Option A or B from section 3)

# 4. Fix Jest config
# (Update jest.config.js as shown in section 4)

# 5. Fix TypeScript errors
# (Apply fixes from section 5)

# 6. Clean build
npm run clean
npm install
npm run build

# 7. Run tests
npm test

# 8. Run examples
npx ts-node examples/basic-usage.ts

# 9. Verify everything works
npm run lint
npm run typecheck
npm test
```

### Verification Checklist

After applying all fixes:

- [ ] `npm install` succeeds with no errors
- [ ] `npm run build` compiles successfully
- [ ] `npm run typecheck` shows 0 errors
- [ ] `npm test` runs all tests
- [ ] Examples execute without errors
- [ ] No TypeScript compilation errors
- [ ] No Jest configuration warnings

---

## Estimated Fix Time

**Total Time:** 6-12 hours

**Breakdown:**
- Add zod dependency: 5 minutes
- Fix type exports: 2-3 hours
- Fix WASM (Option B): 1 hour
- Fix WASM (Option A): 3-4 hours
- Fix Jest config: 30 minutes
- Fix TypeScript errors: 2-3 hours
- Testing and verification: 1-2 hours

---

## Priority Order

1. 🔴 Add zod dependency (5 min)
2. 🔴 Fix WASM references - Option B (1 hour)
3. 🔴 Fix type exports (2-3 hours)
4. 🔴 Fix Jest config (30 min)
5. 🔴 Fix TypeScript errors (2-3 hours)
6. ⚠️ Update dependencies (30 min)
7. 📋 Clean up code quality (1-2 hours)

**Minimum Viable Fix:** Items 1-5 (6-8 hours)

---

**Next Steps:**
1. Start with the critical blockers in order
2. Test after each fix
3. Run full verification after all fixes
4. Update VERIFICATION_REPORT.md with new results

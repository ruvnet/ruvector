# Gemini Models Quick Reference

## TL;DR - Just Tell Me What to Use

### Default Choice: `gemini-2.5-flash` ⭐

```typescript
import { AgenticSynth } from '@ruvector/agentic-synth';

const synth = new AgenticSynth({
  provider: 'gemini',
  model: 'gemini-2.5-flash',  // ← Use this
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.7
});

const data = await synth.generateStructured(YourSchema, { count: 10 });
```

**Why?** Best balance: Fast (3.35s), High quality (98.8%), Affordable

---

## When to Use Each Model

### 🚀 Development/Testing
**Use:** `gemini-2.5-flash-lite`
```typescript
model: 'gemini-2.5-flash-lite'  // Fastest, cheapest
```
- Speed: 2.59s avg
- Quality: 96%
- Cost: ~10x cheaper

### 🎯 Production (General)
**Use:** `gemini-2.5-flash`
```typescript
model: 'gemini-2.5-flash'  // Recommended default
```
- Speed: 3.35s avg
- Quality: 98.8%
- Cost: Balanced

### 💎 Production (High Quality)
**Use:** `gemini-3-pro`
```typescript
model: 'gemini-3-pro'  // Maximum quality
```
- Speed: 5.49s avg
- Quality: 99.6%
- Cost: Premium

### 🧠 Advanced Reasoning
**Use:** `gemini-2.5-pro`
```typescript
model: 'gemini-2.5-pro'  // Analytical tasks
```
- Speed: 4.65s avg
- Quality: 99.2%
- Cost: Mid-high

---

## Performance Cheat Sheet

| Metric | Flash Lite | 2.5 Flash ⭐ | 2.5 Pro | 3 Pro |
|--------|-----------|-------------|---------|-------|
| Speed | 2.59s | 3.35s | 4.65s | 5.49s |
| Quality | 96.0% | 98.8% | 99.2% | 99.6% |
| Cost | $ | $$ | $$$ | $$$$ |
| Records/sec | 11.24 | 8.26 | 5.41 | 4.65 |

---

## Common Scenarios

### Scenario 1: Startup MVP
**Choose:** `gemini-2.5-flash-lite`
- Reason: Fast iteration, low cost
- Trade-off: Slightly lower quality (96%)

### Scenario 2: Production API
**Choose:** `gemini-2.5-flash`
- Reason: Reliable, fast, good quality
- Trade-off: None - best all-around

### Scenario 3: ML Training Data
**Choose:** `gemini-3-pro`
- Reason: Highest quality (99.6%)
- Trade-off: Slower, more expensive

### Scenario 4: Batch Processing (1M+ records)
**Choose:** `gemini-2.5-flash-lite`
- Reason: 11.24 rec/sec, lowest cost
- Trade-off: Monitor quality, validate output

### Scenario 5: Regulated Industry
**Choose:** `gemini-3-pro`
- Reason: Compliance, accuracy critical
- Trade-off: Worth the premium cost

---

## Migration Path

```
Start with: gemini-2.5-flash
    ↓
If too slow → gemini-2.5-flash-lite
    ↓
If quality insufficient → gemini-2.5-pro
    ↓
If still not enough → gemini-3-pro
```

---

## Cost Optimization

### Tiered Strategy
```typescript
// Development
const dev = { model: 'gemini-2.5-flash-lite' };  // Save $$

// Staging
const staging = { model: 'gemini-2.5-flash' };   // Test production config

// Production
const prod = { model: 'gemini-3-pro' };          // Max quality
```

### Batch Optimization
```typescript
// ❌ Don't: 50 individual calls
for (let i = 0; i < 50; i++) {
  await synth.generateStructured(schema, { count: 1 });
}

// ✅ Do: 1 batched call
await synth.generateStructured(schema, { count: 50 });
```
**Savings:** ~5x faster, ~3x cheaper

---

## Setup Checklist

- [ ] Get API key: https://makersuite.google.com/app/apikey
- [ ] Set environment variable: `export GEMINI_API_KEY="..."`
- [ ] Install package: `npm install @ruvector/agentic-synth`
- [ ] Choose model (default: `gemini-2.5-flash`)
- [ ] Configure temperature (0.7 recommended)
- [ ] Add Zod schema validation
- [ ] Test with small counts first
- [ ] Monitor quality in production

---

## Troubleshooting

### API Key Not Found
```bash
export GEMINI_API_KEY="your-api-key"
# or
export GOOGLE_GEMINI_API_KEY="your-api-key"
```

### Rate Limits
- Add delays between requests
- Use batch generation (count > 1)
- Upgrade API tier

### Low Quality Scores
- Upgrade to `gemini-2.5-flash` or `gemini-3-pro`
- Lower temperature (0.5-0.6)
- Improve schema descriptions

### Slow Performance
- Downgrade to `gemini-2.5-flash-lite`
- Simplify schema
- Use batch generation

---

## Example Code

### Basic Usage
```typescript
import { AgenticSynth } from '@ruvector/agentic-synth';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(18).max(120)
});

const synth = new AgenticSynth({
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  apiKey: process.env.GEMINI_API_KEY
});

const users = await synth.generateStructured(UserSchema, {
  count: 10,
  temperature: 0.7
});

console.log(users);
```

### Multi-Environment
```typescript
const MODEL = process.env.NODE_ENV === 'production'
  ? 'gemini-3-pro'           // Production: max quality
  : 'gemini-2.5-flash-lite'; // Dev: fast & cheap

const synth = new AgenticSynth({
  provider: 'gemini',
  model: MODEL,
  apiKey: process.env.GEMINI_API_KEY
});
```

---

## Running Tests

```bash
# Run comprehensive test suite
node tests/gemini-latest-models-test.mjs

# View sample results
cat tests/gemini-model-test-results-sample.json

# Read full guide
cat tests/GEMINI_TESTING_GUIDE.md

# Read recommendations
cat tests/GEMINI_RECOMMENDATION.md
```

---

## Key Takeaways

1. **Default to `gemini-2.5-flash`** - best all-around choice
2. **Use batch generation** - much more efficient
3. **Match model to use case** - dev vs. prod vs. quality-critical
4. **Monitor quality scores** - aim for >95%
5. **Validate with Zod** - catch errors early
6. **Start simple, scale up** - only upgrade if needed

---

**Updated:** November 22, 2025
**Recommendation:** gemini-2.5-flash for 90% of use cases

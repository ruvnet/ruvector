import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'dspy/index': 'src/dspy/index.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
  tsconfig: './tsconfig.json',
  // Mark all dependencies as external to avoid bundling issues
  external: [
    '@ruvector/agentic-synth',
    'dspy.ts',
    'zod',
    'commander',
    'dotenv'
  ],
  // Don't bundle node_modules
  noExternal: []
});

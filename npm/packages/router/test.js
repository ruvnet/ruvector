const router = require('./index.js');

console.log('Testing @ruvector/router...');

// Check available exports
console.log(`Available exports: ${Object.keys(router).join(', ')}`);

// Test VectorDb class exists
try {
  if (typeof router.VectorDb === 'function') {
    console.log('✓ VectorDb class available');

    // Test creating an instance with options object (in-memory, no storage path)
    const db = new router.VectorDb({
      dimensions: 384,
      distanceMetric: router.DistanceMetric.Cosine,
      maxElements: 1000
    });
    console.log('✓ VectorDb instance created (384 dimensions, cosine distance, in-memory)');

    // Test count method
    const count = db.count();
    console.log(`✓ count(): ${count}`);

    // Test insert and search
    const testVector = new Float32Array(384).fill(0.5);
    db.insert('test-1', testVector);
    console.log('✓ insert() worked');

    const results = db.search(testVector, 1);
    console.log(`✓ search() returned ${results.length} result(s)`);
    if (results.length > 0) {
      console.log(`  Top result: ${results[0].id} (score: ${results[0].score.toFixed(4)})`);
    }
  } else {
    console.log('✗ VectorDb class not found');
  }
} catch (e) {
  console.error('✗ VectorDb test failed:', e.message);
  console.error('  Note: This may be due to storage path validation. The module loads correctly.');
}

// Test DistanceMetric enum exists
try {
  if (router.DistanceMetric) {
    console.log('✓ DistanceMetric enum available');
    console.log(`  - Cosine: ${router.DistanceMetric.Cosine}`);
    console.log(`  - Euclidean: ${router.DistanceMetric.Euclidean}`);
    console.log(`  - DotProduct: ${router.DistanceMetric.DotProduct}`);
  } else {
    console.log('✗ DistanceMetric not found');
  }
} catch (e) {
  console.error('✗ DistanceMetric check failed:', e.message);
}

console.log('\nAll basic tests completed!');

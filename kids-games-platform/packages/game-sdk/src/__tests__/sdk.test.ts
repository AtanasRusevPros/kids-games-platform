// Placeholder — game-sdk is a type-only package for MVP.
// Tests will be added when game modules are implemented.
import { describe, it, expect } from 'vitest';

describe('game-sdk', () => {
  it('is importable', async () => {
    const sdk = await import('../index.js');
    expect(sdk).toBeDefined();
  });
});

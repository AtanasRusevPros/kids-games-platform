import { describe, it, expect } from 'vitest';
import { RegisterSchema, LoginSchema, MarkKnownSchema } from '../schemas.js';

describe('RegisterSchema', () => {
  it('accepts valid registration data', () => {
    const result = RegisterSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = RegisterSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
      displayName: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = RegisterSchema.safeParse({
      email: 'test@example.com',
      password: 'short',
      displayName: 'Test User',
    });
    expect(result.success).toBe(false);
  });
});

describe('LoginSchema', () => {
  it('accepts valid login data', () => {
    const result = LoginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });
});

describe('MarkKnownSchema', () => {
  it('accepts valid mark known payload', () => {
    const result = MarkKnownSchema.safeParse({
      cardId: '123e4567-e89b-12d3-a456-426614174000',
      known: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid cardId', () => {
    const result = MarkKnownSchema.safeParse({ cardId: 'not-a-uuid', known: true });
    expect(result.success).toBe(false);
  });
});

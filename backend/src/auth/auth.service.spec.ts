import { hashPassword, verifyPassword } from './password.util';

describe('password helpers', () => {
  it('hashes and validates a password', () => {
    const hash = hashPassword('admin123');

    expect(verifyPassword('admin123', hash)).toBe(true);
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });
});

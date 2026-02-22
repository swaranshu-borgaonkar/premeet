import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from '../lib/token-encryption.js';

// Node.js 20+ has globalThis.crypto with subtle built-in (via webcrypto).
// Vitest runs in Node, so crypto.subtle is available natively.
// We just need to ensure the btoa/atob polyfills exist.
if (typeof globalThis.btoa === 'undefined') {
  globalThis.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}
if (typeof globalThis.atob === 'undefined') {
  globalThis.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');
}

describe('token-encryption', () => {
  const testToken = 'ya29.a0AfH6SMBx-super-secret-google-oauth-token';
  const userId = 'user-abc-123';

  describe('encrypt/decrypt round-trip', () => {
    it('should decrypt to the original plaintext', async () => {
      const encrypted = await encryptToken(testToken, userId);
      const decrypted = await decryptToken(encrypted, userId);
      expect(decrypted).toBe(testToken);
    });

    it('should handle empty string tokens', async () => {
      const encrypted = await encryptToken('', userId);
      const decrypted = await decryptToken(encrypted, userId);
      expect(decrypted).toBe('');
    });

    it('should handle unicode content', async () => {
      const unicodeToken = 'token-with-unicode-\u00e9\u00e8\u00ea-chars';
      const encrypted = await encryptToken(unicodeToken, userId);
      const decrypted = await decryptToken(encrypted, userId);
      expect(decrypted).toBe(unicodeToken);
    });

    it('should handle long tokens', async () => {
      const longToken = 'x'.repeat(10000);
      const encrypted = await encryptToken(longToken, userId);
      const decrypted = await decryptToken(encrypted, userId);
      expect(decrypted).toBe(longToken);
    });
  });

  describe('encryption output', () => {
    it('should produce output different from the input', async () => {
      const encrypted = await encryptToken(testToken, userId);
      expect(encrypted).not.toBe(testToken);
    });

    it('should produce base64-encoded output', async () => {
      const encrypted = await encryptToken(testToken, userId);
      // Base64 pattern: only valid base64 chars
      expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should produce different ciphertext each time due to random IV', async () => {
      const encrypted1 = await encryptToken(testToken, userId);
      const encrypted2 = await encryptToken(testToken, userId);
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('key isolation', () => {
    it('should fail to decrypt with a different user ID', async () => {
      const encrypted = await encryptToken(testToken, userId);
      await expect(
        decryptToken(encrypted, 'different-user-456')
      ).rejects.toThrow();
    });

    it('should produce different ciphertext for different user IDs', async () => {
      const encrypted1 = await encryptToken(testToken, 'user-1');
      const encrypted2 = await encryptToken(testToken, 'user-2');
      // While technically they could collide, with random IVs and different keys
      // this is astronomically unlikely
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('tamper detection', () => {
    it('should fail to decrypt tampered ciphertext', async () => {
      const encrypted = await encryptToken(testToken, userId);
      // Flip a character in the middle of the ciphertext
      const chars = encrypted.split('');
      const mid = Math.floor(chars.length / 2);
      chars[mid] = chars[mid] === 'A' ? 'B' : 'A';
      const tampered = chars.join('');

      await expect(decryptToken(tampered, userId)).rejects.toThrow();
    });
  });
});

const SALT_PREFIX = 'prepmeet_token_v1_';
const ITERATIONS = 100000;

/**
 * Derive an AES-GCM-256 key from userId + extension salt
 */
async function deriveKey(userId) {
  const encoder = new TextEncoder();
  const salt = encoder.encode(SALT_PREFIX + userId);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a token string using AES-GCM-256
 * @param {string} token - The token to encrypt
 * @param {string} userId - User ID for key derivation
 * @returns {string} Base64-encoded encrypted data (iv + ciphertext)
 */
export async function encryptToken(token, userId) {
  const key = await deriveKey(userId);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(token)
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt an encrypted token
 * @param {string} encryptedData - Base64-encoded encrypted data
 * @param {string} userId - User ID for key derivation
 * @returns {string} Decrypted token
 */
export async function decryptToken(encryptedData, userId) {
  const key = await deriveKey(userId);
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

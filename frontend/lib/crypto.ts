export type CryptoResult = {
  success: true;
  payload: Uint8Array;
} | {
  success: false;
  error: string;
};

const MAGIC = new Uint8Array([0x53, 0x54, 0x45, 0x47]); // 'STEG'
const VERSION = 0x01;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH_BITS = 256;
const PBKDF2_ITERATIONS = 200_000;
const GCM_TAG_LENGTH_BITS = 128;

export async function encrypt(plaintext: string, password: string): Promise<CryptoResult> {
  if (!plaintext) {
    return { success: false, error: 'Plaintext is required' };
  }

  try {
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);

    // Generate salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: KEY_LENGTH_BITS },
      false,
      ['encrypt']
    );

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: GCM_TAG_LENGTH_BITS },
      key,
      plaintextBytes
    );

    // Build payload
    const payload = new Uint8Array(
      4 + 1 + 4 + 1 + 1 + salt.length + iv.length + ciphertext.byteLength
    );
    const view = new DataView(payload.buffer);

    // MAGIC
    payload.set(MAGIC, 0);
    // VERSION
    view.setUint8(4, VERSION);
    // CIPHERTEXT_LENGTH
    view.setUint32(5, ciphertext.byteLength, false); // big-endian
    // SALT_LEN
    view.setUint8(9, salt.length);
    // IV_LEN
    view.setUint8(10, iv.length);
    // SALT
    payload.set(salt, 11);
    // IV
    payload.set(iv, 11 + salt.length);
    // CIPHERTEXT
    payload.set(new Uint8Array(ciphertext), 11 + salt.length + iv.length);

    return { success: true, payload };
  } catch (error) {
    return { success: false, error: `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export async function decrypt(payload: Uint8Array, password: string): Promise<CryptoResult> {
  if (!payload || payload.length < 11) {
    return { success: false, error: 'Invalid payload' };
  }

  try {
    const view = new DataView(payload.buffer);

    // Check MAGIC
    if (payload[0] !== MAGIC[0] || payload[1] !== MAGIC[1] ||
        payload[2] !== MAGIC[2] || payload[3] !== MAGIC[3]) {
      return { success: false, error: 'Invalid payload header' };
    }

    // Check VERSION
    if (view.getUint8(4) !== VERSION) {
      return { success: false, error: 'Unsupported payload version' };
    }

    const ciphertextLength = view.getUint32(5, false); // big-endian
    const saltLen = view.getUint8(9);
    const ivLen = view.getUint8(10);

    if (payload.length !== 11 + saltLen + ivLen + ciphertextLength) {
      return { success: false, error: 'Payload length mismatch' };
    }

    const salt = payload.slice(11, 11 + saltLen);
    const iv = payload.slice(11 + saltLen, 11 + saltLen + ivLen);
    const ciphertext = payload.slice(11 + saltLen + ivLen);

    // Derive key
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: KEY_LENGTH_BITS },
      false,
      ['decrypt']
    );

    // Decrypt
    const plaintextBytes = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: GCM_TAG_LENGTH_BITS },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    const plaintext = decoder.decode(plaintextBytes);

    return { success: true, payload: new Uint8Array(plaintextBytes) };
  } catch (error) {
    return { success: false, error: `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export function payloadToString(payload: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(payload);
}
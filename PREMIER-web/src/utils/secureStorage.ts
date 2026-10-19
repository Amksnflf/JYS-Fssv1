const SALT_SEED = 'PRM_v2_9f8a7b6c5d4e3f2a1b0c';
const CIPHER_PREFIX = '__enc_v2$:';
const KEY_PREFIX = '_p$';

function getDynamicSalt(): string {
  const host = typeof window !== 'undefined' ? window.location.hostname || 'local' : 'local';
  return `${SALT_SEED}:${host}`;
}

function xorBytes(input: Uint8Array, keyStr: string): Uint8Array {
  const keyBytes = new TextEncoder().encode(keyStr);
  const out = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) {
    out[i] = input[i] ^ keyBytes[i % keyBytes.length] ^ ((i * 31) & 0xff);
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function obfuscateKey(rawKey: string): string {
  const salt = getDynamicSalt();
  let hash = 2166136261;
  const combined = `${rawKey}#${salt}`;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  const encoded = bytesToBase64(xorBytes(new TextEncoder().encode(rawKey), salt))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${KEY_PREFIX}${hex}_${encoded}`;
}

export function encryptValue(plain: string): string {
  try {
    const salt = getDynamicSalt();
    const nonce = Math.floor(Math.random() * 65535)
      .toString(16)
      .padStart(4, '0');
    const rawBytes = new TextEncoder().encode(plain);
    const cipherBytes = xorBytes(rawBytes, `${salt}:${nonce}`);
    return `${CIPHER_PREFIX}${nonce}:${bytesToBase64(cipherBytes)}`;
  } catch {
    return plain;
  }
}

export function decryptValue(stored: string): string {
  if (!stored) return '';
  if (!stored.startsWith(CIPHER_PREFIX)) {
    return stored;
  }
  try {
    const body = stored.slice(CIPHER_PREFIX.length);
    const sepIndex = body.indexOf(':');
    if (sepIndex === -1) return '';
    const nonce = body.slice(0, sepIndex);
    const b64 = body.slice(sepIndex + 1);
    const cipherBytes = base64ToBytes(b64);
    const plainBytes = xorBytes(cipherBytes, `${getDynamicSalt()}:${nonce}`);
    return new TextDecoder().decode(plainBytes);
  } catch {
    return '';
  }
}

export const secureStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const obfKey = obfuscateKey(key);
      const encrypted = window.localStorage.getItem(obfKey);
      if (encrypted !== null) {
        const plain = decryptValue(encrypted);
        return plain || null;
      }
      // Backward compatibility: migrate legacy plaintext key if present
      const legacy = window.localStorage.getItem(key);
      if (legacy !== null) {
        const plain = legacy.startsWith(CIPHER_PREFIX) ? decryptValue(legacy) : legacy;
        if (plain) {
          window.localStorage.setItem(obfKey, encryptValue(plain));
        }
        window.localStorage.removeItem(key);
        return plain || null;
      }
      return null;
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      const obfKey = obfuscateKey(key);
      window.localStorage.setItem(obfKey, encryptValue(value));
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage quota / private mode errors
    }
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      const obfKey = obfuscateKey(key);
      window.localStorage.removeItem(obfKey);
      window.localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },
};

export function maskSensitiveText(value?: string | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.includes('@')) {
    const [local, domain] = trimmed.split('@');
    if (!domain) return trimmed;
    const prefix = local.slice(0, Math.min(2, local.length));
    return `${prefix}***@${domain}`;
  }
  if (/^\+?\d{7,15}$/.test(trimmed)) {
    if (trimmed.length <= 7) return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
    return `${trimmed.slice(0, 3)}****${trimmed.slice(-4)}`;
  }
  if (trimmed.length > 10) {
    return `${trimmed.slice(0, 4)}***${trimmed.slice(-4)}`;
  }
  if (trimmed.length > 5) {
    return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
  }
  return trimmed;
}

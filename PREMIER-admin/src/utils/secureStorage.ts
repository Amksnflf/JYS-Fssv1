const SALT = 'PR3M13R_ADM_S4LT_2026_X9#kL';
const PREFIX = 'enc:v1:';

function xorCipher(input: string, key: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    out += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}

function encode(plain: string): string {
  try {
    const utf8 = encodeURIComponent(plain);
    const xored = xorCipher(utf8, SALT);
    return PREFIX + btoa(xored);
  } catch {
    return plain;
  }
}

function decode(raw: string): string {
  if (!raw.startsWith(PREFIX)) {
    return raw;
  }
  try {
    const b64 = raw.slice(PREFIX.length);
    const xored = atob(b64);
    const utf8 = xorCipher(xored, SALT);
    return decodeURIComponent(utf8);
  } catch {
    return '';
  }
}

export const secureStorage = {
  getItem(key: string): string | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      if (!raw.startsWith(PREFIX)) {
        // Migrate legacy plaintext value to obfuscated storage
        this.setItem(key, raw);
        return raw;
      }
      return decode(raw) || null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, encode(value));
    } catch {
      // ignore storage errors
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore storage errors
    }
  },
};


// --- 1. URL Obfuscation (Prevents ID scraping) ---
export const encodeId = (id: string): string => {
  if (!id) return '';
  try {
    // Simple obfuscation + salt (Prevents casual eye-balling)
    return btoa(`EXAMIO_${id}_SECURE`).replace(/=/g, '');
  } catch (e) {
    return id;
  }
};

export const decodeId = (token: string): string => {
  if (!token) return '';
  try {
    const decoded = atob(token);
    if (decoded.startsWith('EXAMIO_') && decoded.endsWith('_SECURE')) {
      return decoded.replace('EXAMIO_', '').replace('_SECURE', '');
    }
    return token; // Fallback for legacy IDs
  } catch (e) {
    return token;
  }
};

// --- 2. Secure LocalStorage (Tamper Protection) ---
const STORAGE_PREFIX = 'EXAMIO_SECure_';
const HMAC_KEY = 'examio-integrity-key'; // In prod, use env var

const generateSignature = (data: string): string => {
  // Simple hash for client-side integrity (Prevent DevTools tampering)
  let hash = 0;
  const str = data + HMAC_KEY;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

export const SecureStorage = {
  setItem: (key: string, value: any) => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const stringValue = JSON.stringify(value);
      const signature = generateSignature(stringValue);
      const payload = JSON.stringify({ d: stringValue, s: signature });
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, payload);
    } catch (e) {
      console.error("Storage Error (setItem):", e);
    }
  },

  getItem: (key: string) => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.d || !parsed.s) return null;

      const calculatedSig = generateSignature(parsed.d);

      if (calculatedSig !== parsed.s) {
        console.warn("Security Alert: LocalStorage tampering detected. Clearing data.");
        localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
        return null;
      }

      return JSON.parse(parsed.d);
    } catch (e) {
      // console.warn("Storage Error (getItem):", e);
      return null;
    }
  },

  removeItem: (key: string) => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch (e) {
      console.error("Storage Error (removeItem):", e);
    }
  }
};

// --- 3. Obfuscated Cache (For Questions) ---
// This makes the JSON unreadable in DevTools (XOR Cipher + Base64)
const CACHE_SALT = "EXAMiO_Smart_Cache_v1";

export const obfuscateData = (data: any): string => {
    try {
        const json = JSON.stringify(data);
        const encoder = new TextEncoder();
        const bytes = encoder.encode(json);
        const saltBytes = encoder.encode(CACHE_SALT);
        
        const result = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            result[i] = bytes[i] ^ saltBytes[i % saltBytes.length];
        }
        
        let binary = '';
        for (let i = 0; i < result.length; i++) {
            binary += String.fromCharCode(result[i]);
        }
        return btoa(binary);
    } catch (e) {
        console.error("Obfuscation Failed", e);
        return "";
    }
};

export const deobfuscateData = (cipher: string): any => {
    if (!cipher) return null;
    try {
        // Basic validation for base64
        const trimmed = cipher.trim();
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(trimmed)) {
            return null;
        }
        const binary = atob(trimmed);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        
        const encoder = new TextEncoder();
        const saltBytes = encoder.encode(CACHE_SALT);
        
        const result = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            result[i] = bytes[i] ^ saltBytes[i % saltBytes.length];
        }
        
        const decoder = new TextDecoder();
        const json = decoder.decode(result);
        return JSON.parse(json);
    } catch (e) {
        console.error("Deobfuscation Failed", e);
        return null;
    }
};

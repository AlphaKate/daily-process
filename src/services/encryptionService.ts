/**
 * Local Data-at-Rest Encryption Service (Web Crypto API - AES-256-GCM)
 * 
 * Provides transparent, high-performance encryption for all locally stored tasks.
 * Uses a non-exportable 256-bit AES-GCM key stored natively in the browser's IndexedDB.
 * In localStorage, tasks appear as encrypted ciphertext envelopes:
 *   {"enc":"aes-256-gcm","iv":"...","ct":"..."}
 */

const DB_NAME = 'daily_proc_security_v1';
const STORE_NAME = 'security_keys';
const KEY_NAME = 'device_enc_key_v1';

let cachedKey: CryptoKey | null = null;

// Convert Uint8Array to base64
const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Convert base64 to Uint8Array
const base64ToUint8Array = (base64: string): Uint8Array => {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

// Open IndexedDB database
const openKeyDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

// Retrieve or generate persistent AES-GCM 256-bit device key
export const getDeviceEncryptionKey = async (): Promise<CryptoKey> => {
  if (cachedKey) return cachedKey;

  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto API is not available');
  }

  try {
    const db = await openKeyDb();

    // Check if key already exists
    const existingKey = await new Promise<CryptoKey | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_NAME);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    if (existingKey) {
      cachedKey = existingKey;
      return existingKey;
    }

    // Generate new non-exportable 256-bit AES-GCM key
    const newKey = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      false, // non-exportable for maximum security
      ['encrypt', 'decrypt']
    );

    // Save key to IndexedDB natively as CryptoKey object
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(newKey, KEY_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    cachedKey = newKey;
    return newKey;
  } catch (err) {
    console.warn('Failed to access IndexedDB for key storage, generating in-memory session key:', err);
    const sessionKey = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    cachedKey = sessionKey;
    return sessionKey;
  }
};

/**
 * Encrypts a string into an AES-256-GCM ciphertext envelope.
 */
export const encryptString = async (plaintext: string): Promise<string> => {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return plaintext;
  }

  try {
    const key = await getDeviceEncryptionKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encoded
    );

    const envelope = {
      enc: 'aes-256-gcm',
      iv: uint8ArrayToBase64(iv),
      ct: uint8ArrayToBase64(new Uint8Array(ciphertext))
    };

    return JSON.stringify(envelope);
  } catch (e) {
    console.error('Encryption failed, falling back to plaintext:', e);
    return plaintext;
  }
};

/**
 * Decrypts an AES-256-GCM ciphertext envelope back into plaintext string.
 * Supports transparent fallback if content is legacy plaintext JSON.
 */
export const decryptString = async (ciphertextEnvelope: string): Promise<string> => {
  if (!ciphertextEnvelope || typeof ciphertextEnvelope !== 'string') {
    return '';
  }

  // Check if payload is an encrypted AES-GCM envelope
  if (!ciphertextEnvelope.startsWith('{"enc":"aes-256-gcm"')) {
    // Legacy plaintext: return as-is
    return ciphertextEnvelope;
  }

  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return ciphertextEnvelope;
  }

  try {
    const envelope = JSON.parse(ciphertextEnvelope);
    if (!envelope.iv || !envelope.ct) {
      return ciphertextEnvelope;
    }

    const key = await getDeviceEncryptionKey();
    const iv = base64ToUint8Array(envelope.iv);
    const ct = base64ToUint8Array(envelope.ct);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource
      },
      key,
      ct as BufferSource
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('Decryption failed for payload:', e);
    return '';
  }
};

/**
 * Erases the encryption key permanently from IndexedDB (Crypto-Shredding).
 */
export const purgeEncryptionKeys = async (): Promise<void> => {
  cachedKey = null;
  try {
    if (typeof indexedDB !== 'undefined') {
      indexedDB.deleteDatabase(DB_NAME);
    }
  } catch (e) {
    console.warn('Could not delete key database:', e);
  }
};

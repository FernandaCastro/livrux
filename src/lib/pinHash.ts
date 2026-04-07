// SHA-256 hashing for PIN codes.
// Prefer Web Crypto when available and fall back to Expo Crypto for runtimes
// where `globalThis.crypto` is not exposed.
// This is sufficient to prevent casual access — it is not designed for adversarial contexts.

export async function hashPin(pin: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;

  if (subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const expoCrypto = await loadExpoCrypto();
  return expoCrypto.digestStringAsync(expoCrypto.CryptoDigestAlgorithm.SHA256, pin);
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin);
  return hash === storedHash;
}


async function loadExpoCrypto(): Promise<{
  digestStringAsync: (algorithm: string, data: string) => Promise<string>;
  CryptoDigestAlgorithm: { SHA256: string };
}> {
  try {
    return await import('expo-crypto');
  } catch {
    throw new Error(
      "PIN hash unavailable: neither Web Crypto nor 'expo-crypto' is available."
    );
  }
}

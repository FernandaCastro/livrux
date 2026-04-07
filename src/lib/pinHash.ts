// SHA-256 hashing for PIN codes using the Web Crypto API built into React Native 0.71+.
// This is sufficient to prevent casual access — it is not designed for adversarial contexts.

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin);
  return hash === storedHash;
}

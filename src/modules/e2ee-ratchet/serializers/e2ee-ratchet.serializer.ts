export function serializeEncryptResult(
  ciphertextBase64: string,
  header?: { dhPublic: string; messageNumber: number; previousChainLength: number },
) {
  if (header) {
    return { ciphertext: ciphertextBase64, header };
  }
  return { ciphertext: ciphertextBase64 };
}

export function serializeDecryptResult(plaintext: string) {
  return { plaintext };
}

export function serializeRatchetStepResult(dhPublic: string, rootKey: string) {
  return { dhPublic, rootKey };
}
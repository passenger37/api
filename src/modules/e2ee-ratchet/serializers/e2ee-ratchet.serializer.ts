export function serializeEncryptResult(
  ciphertext: string,
  header: { dhPublic: string; messageNumber: number; previousChainLength: number },
) {
  return { ciphertext, header };
}

export function serializeDecryptResult(plaintext: string) {
  return { plaintext };
}

export function serializeRatchetStepResult(
  dhPublic: string,
  rootKey: string,
) {
  return { dhPublic, rootKey };
}
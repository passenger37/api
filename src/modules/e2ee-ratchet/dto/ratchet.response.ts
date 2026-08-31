export class EncryptResponseDto {
  ciphertext: string;
  header: {
    dhPublic: string;
    messageNumber: number;
    previousChainLength: number;
  };
}

export class DecryptResponseDto {
  plaintext: string;
}

export class RatchetStepResponseDto {
  dhPublic: string;
  rootKey: string;
}
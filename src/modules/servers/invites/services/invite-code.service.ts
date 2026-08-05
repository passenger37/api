import { Injectable } from '@nestjs/common';

@Injectable()
export class InviteCodeService {
  private readonly alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

  generate(length = 8): string {
    let code = '';

    for (let i = 0; i < length; i++) {
      const random = Math.floor(Math.random() * this.alphabet.length);

      code += this.alphabet[random];
    }

    return code;
  }
}

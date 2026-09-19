import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class WebSocketValidationPipe implements PipeTransform {
  async transform(value: unknown, metadata: ArgumentMetadata) {
    if (!metadata.metatype) {
      return value;
    }

    // Only @MessageBody() payloads are DTOs. @ConnectedSocket() hands us the
    // live socket.io Socket instance; transforming it into a class-transformer
    // instance would re-construct `new Socket()` (which reads `server` off
    // undefined). Mirror the built-in ValidationPipe and skip custom params.
    if (metadata.type !== 'body') {
      return value;
    }

    const object = plainToInstance(metadata.metatype, value);

    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException('Invalid WebSocket payload.');
    }

    return object;
  }
}

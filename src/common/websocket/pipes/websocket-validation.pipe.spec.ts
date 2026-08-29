import { WebSocketValidationPipe } from './websocket-validation.pipe';
import { IsString, MinLength, MaxLength } from 'class-validator';

class TestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  name: string;
}

describe('WebSocketValidationPipe', () => {
  let pipe: WebSocketValidationPipe;

  beforeEach(() => {
    pipe = new WebSocketValidationPipe();
  });

  it('should transform valid payload', async () => {
    const value = { name: 'valid' };
    const metadata = { metatype: TestDto } as any;
    const result = await pipe.transform(value, metadata);
    expect(result).toBeInstanceOf(TestDto);
    expect(result.name).toBe('valid');
  });

  it('should throw BadRequestException for invalid payload', async () => {
    const value = { name: '' };
    const metadata = { metatype: TestDto } as any;
    await expect(pipe.transform(value, metadata)).rejects.toThrow(
      'Invalid WebSocket payload.',
    );
  });

  it('should return value unchanged when no metatype', async () => {
    const value = { anything: true };
    const metadata = { metatype: undefined } as any;
    const result = await pipe.transform(value, metadata);
    expect(result).toBe(value);
  });
});

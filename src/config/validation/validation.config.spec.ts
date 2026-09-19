import { ValidationPipe, ArgumentMetadata } from '@nestjs/common';
import { IsOptional, IsPositive, IsString, Length, Min } from 'class-validator';
import { VALIDATION_PIPE_OPTIONS } from './validation.config';

class TestContractDto {
  @IsString()
  @Length(2, 20)
  username!: string;

  @IsOptional()
  @IsPositive()
  @Min(1)
  pageSize?: number;
}

describe('validation.config (OpenAPI-aligned request contract)', () => {
  const pipe = new ValidationPipe(VALIDATION_PIPE_OPTIONS);
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: TestContractDto,
    data: '',
  };

  it('whitelists & transforms known fields, converting implicit types', async () => {
    const value = await pipe.transform(
      { username: 'alice', pageSize: '20' },
      metadata,
    );
    expect(value.username).toBe('alice');
    expect(typeof value.pageSize).toBe('number');
    expect(value.pageSize).toBe(20);
  });

  it('rejects fields not present in the documented DTO (forbidNonWhitelisted)', async () => {
    await expect(
      pipe.transform({ username: 'alice', admin: true }, metadata),
    ).rejects.toThrow();
  });

  it('rejects request payloads of an unknown/undocumented value type', async () => {
    await expect(pipe.transform(42, metadata)).rejects.toThrow();
  });

  it('rejects values that violate DTO constraints', async () => {
    await expect(pipe.transform({ username: 'x' }, metadata)).rejects.toThrow();
  });
});

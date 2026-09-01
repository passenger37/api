import { Global, Module } from '@nestjs/common';
import { ContractManifestService } from './contract-manifest.service';

/**
 * Lecture 40.86 - API & WebSocket Contract Tests.
 *
 * @Global so any feature can inspect the protected-contract manifest. The
 * manifest itself is pure data (see `contract-manifest.ts`); keeping it a
 * service lets future HTTP/WS surfaces expose it or assert against it.
 */
@Global()
@Module({
  providers: [ContractManifestService],
  exports: [ContractManifestService],
})
export class ContractsModule {}

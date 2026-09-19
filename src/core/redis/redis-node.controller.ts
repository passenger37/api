import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RedisNodeRegistry } from './redis-node-registry';
import { Public } from '../../common/decorators';

@ApiTags('Cluster / Nodes')
@Controller('instances')
export class RedisNodeController {
  constructor(private readonly nodeRegistry: RedisNodeRegistry) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Live API instance registry (multi-instance scaling view)',
  })
  async list() {
    return {
      instanceId: this.nodeRegistry.instanceId(),
      nodeCount: await this.nodeRegistry.countInstances(),
      nodes: await this.nodeRegistry.listInstances(),
    };
  }
}

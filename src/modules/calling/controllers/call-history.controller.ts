import { Controller, Get, Query } from '@nestjs/common';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CallRepository } from '../repositories/call.repository';
import { CallHistoryQuery } from '../dto/query/call-history.query';

@Controller('calls')
export class CallHistoryController {
  constructor(private readonly callRepo: CallRepository) {}

  /** Terminal calls the caller was part of. */
  @Get('history')
  async history(
    @CurrentUser('id') userId: string,
    @Query() query: CallHistoryQuery,
  ) {
    const calls = await this.callRepo.findUserCallHistory(userId, {
      skip: query.offset ?? 0,
      take: query.limit ?? 30,
    });

    return {
      calls,
      offset: query.offset ?? 0,
      limit: query.limit ?? 30,
    };
  }
}

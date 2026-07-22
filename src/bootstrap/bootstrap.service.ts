import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { AuthorizationBootstrapService } from '../modules/auth/services/authorization-bootstrap.service';

@Injectable()
export class BootstrapService
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(
    BootstrapService.name,
  );

  constructor(
    private readonly config: ConfigService,
    private readonly authorizationBootstrap: AuthorizationBootstrapService,
  ) {}

  async onApplicationBootstrap() {
    const enabled = this.config.get<boolean>(
      'AUTH_BOOTSTRAP_ENABLED',
      false,
    );

    if (!enabled) {
      this.logger.log(
        'Authorization bootstrap disabled.',
      );
      return;
    }

    this.logger.log(
      'Running authorization bootstrap...',
    );

    await this.authorizationBootstrap.bootstrap();

    this.logger.log(
      'Authorization bootstrap completed.',
    );
  }
}
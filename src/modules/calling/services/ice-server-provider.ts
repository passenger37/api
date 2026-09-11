import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DEFAULT_STUN_SERVERS } from '../constants/calling.constants';

export interface IceServer {
  urls: string;
  username?: string;
  credential?: string;
}

/**
 * Config-driven ICE server provider. TURN is optional today — when no
 * TURN servers are configured the gateway serves public STUN servers only.
 * Docs: docs/architecture/calling/webrtc.md (TURN readiness).
 */
@Injectable()
export class IceServerProvider {
  private readonly defaultStunServers: IceServer[];

  constructor(config: ConfigService) {
    const raw = config.get<string>('CALLING_ICE_SERVERS');
    const parsed = this.parseConfiguredServers(raw ? raw.split(',') : []);
    this.defaultStunServers = parsed.length > 0 ? parsed : DEFAULT_STUN_SERVERS;
  }

  /** ICE server list the signaling client should use to establish media. */
  async getIceServers(): Promise<IceServer[]> {
    return this.defaultStunServers.map((s) => ({ ...s }));
  }

  private parseConfiguredServers(value?: string[]): IceServer[] {
    if (!value || value.length === 0) {
      return [];
    }
    const servers: IceServer[] = [];
    for (const raw of value) {
      const item = this.parseOne(raw);
      if (item) {
        servers.push(item);
      }
    }
    return servers;
  }

  private parseOne(raw: string): IceServer | null {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    // Accepts "stun:host:port" / "turn:host:port?username=u&credential=p".
    const [url, query] = trimmed.split('?');
    if (!url) {
      return null;
    }
    const server: IceServer = { urls: url };
    if (query) {
      const params = new URLSearchParams(`?${query}`);
      const username = params.get('username');
      const credential = params.get('credential');
      if (username) {
        server.username = username;
      }
      if (credential) {
        server.credential = credential;
      }
    }
    return server;
  }
}
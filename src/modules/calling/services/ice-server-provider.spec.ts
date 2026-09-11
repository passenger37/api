import { ConfigService } from '@nestjs/config';

import { IceServerProvider } from './ice-server-provider';
import { DEFAULT_STUN_SERVERS } from '../constants/calling.constants';

describe('IceServerProvider', () => {
  const configOf = (env: Record<string, string | undefined>) =>
    new ConfigService(env);

  it('falls back to public STUN servers when nothing is configured', async () => {
    const provider = new IceServerProvider(configOf({}));

    const servers = await provider.getIceServers();
    expect(servers).toEqual(DEFAULT_STUN_SERVERS);
  });

  it('parses a comma-separated CALLING_ICE_SERVERS list', async () => {
    const provider = new IceServerProvider(
      configOf({
        CALLING_ICE_SERVERS:
          'stun:stun.l.google.com:19302,turn:turn.example.com:3478?username=nexus&credential=s3cret',
      }),
    );

    const servers = await provider.getIceServers();
    expect(servers).toHaveLength(2);
    expect(servers[0]).toEqual({ urls: 'stun:stun.l.google.com:19302' });
    expect(servers[1]).toEqual({
      urls: 'turn:turn.example.com:3478',
      username: 'nexus',
      credential: 's3cret',
    });
  });

  it('skips empty entries and returns a defensive copy', async () => {
    const provider = new IceServerProvider(
      configOf({ CALLING_ICE_SERVERS: ',   ,stun:stun.example.com:19302' }),
    );

    const servers = await provider.getIceServers();
    expect(servers).toHaveLength(1);

    servers[0].urls = 'oops';
    const again = await provider.getIceServers();
    expect(again[0].urls).toBe('stun:stun.example.com:19302');
  });
});
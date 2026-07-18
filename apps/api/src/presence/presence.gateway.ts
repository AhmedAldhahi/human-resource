import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PresenceService } from './presence.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'presence',
})
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly presenceService: PresenceService) {}

  async handleConnection(client: Socket) {
    // Send initial presence feed on connection
    try {
      const records = await this.presenceService.getLivePresence();
      const stats = await this.presenceService.getPresenceStats();
      client.emit('presence_feed', { records, stats });
    } catch {
      // ignore errors on early connect
    }
  }

  handleDisconnect(client: Socket) {
    // Client disconnected
  }

  @SubscribeMessage('request_feed')
  async handleRequestFeed(client: Socket) {
    const records = await this.presenceService.getLivePresence();
    const stats = await this.presenceService.getPresenceStats();
    client.emit('presence_feed', { records, stats });
  }

  async broadcastPresenceUpdate() {
    if (!this.server) return;
    try {
      const records = await this.presenceService.getLivePresence();
      const stats = await this.presenceService.getPresenceStats();
      this.server.emit('presence_feed', { records, stats });
    } catch {
      // ignore
    }
  }
}

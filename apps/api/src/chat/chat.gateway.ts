import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Map to keep track of connected users: userId -> socketId[]
  private connectedUsers = new Map<string, string[]>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Authenticate via token in handshake auth or query
      const token = client.handshake.auth.token || client.handshake.headers['authorization']?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;
      
      // Store socketId in client data
      client.data.userId = userId;

      // Add to connected users
      const userSockets = this.connectedUsers.get(userId) || [];
      userSockets.push(client.id);
      this.connectedUsers.set(userId, userSockets);

      // Join all user's conversation rooms
      const conversations = await this.chatService.getUserConversations(userId);
      conversations.forEach(conv => {
        client.join(`conversation_${conv.id}`);
      });
      
      // Also join a personal room for direct user-to-user system events
      client.join(`user_${userId}`);

    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      let userSockets = this.connectedUsers.get(userId) || [];
      userSockets = userSockets.filter(id => id !== client.id);
      if (userSockets.length === 0) {
        this.connectedUsers.delete(userId);
      } else {
        this.connectedUsers.set(userId, userSockets);
      }
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; content: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    // Save to DB
    const message = await this.chatService.saveMessage(payload.conversationId, userId, payload.content);

    // Broadcast to room
    this.server.to(`conversation_${payload.conversationId}`).emit('new_message', message);
    
    // Also notify users (in case they haven't joined the room yet due to a new conversation)
    // We can emit 'conversation_updated'
    this.server.to(`conversation_${payload.conversationId}`).emit('conversation_updated', {
      conversationId: payload.conversationId,
      lastMessage: message
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    // Broadcast to everyone else in the room
    client.broadcast.to(`conversation_${payload.conversationId}`).emit('user_typing', {
      conversationId: payload.conversationId,
      userId,
      isTyping: payload.isTyping,
    });
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    client.join(`conversation_${payload.conversationId}`);
  }
}

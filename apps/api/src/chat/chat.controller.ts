import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('users')
  async getUsers() {
    return this.chatService.getUsersForChat();
  }

  @Get('conversations')
  async getConversations(@Req() req: any) {
    return this.chatService.getUserConversations(req.user.userId);
  }

  @Get('conversations/:id/messages')
  async getMessages(@Param('id') id: string, @Req() req: any) {
    return this.chatService.getConversationMessages(id, req.user.userId);
  }

  @Post('conversations/direct')
  async createDirectConversation(@Body('partnerId') partnerId: string, @Req() req: any) {
    return this.chatService.findOrCreateDirectConversation(req.user.userId, partnerId);
  }

  @Post('conversations/:id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    await this.chatService.updateLastRead(id, req.user.userId);
    return { success: true };
  }
}

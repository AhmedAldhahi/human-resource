import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getUsersForChat() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        department: true,
        photoUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getUserConversations(userId: string) {
    const participations = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              where: { userId: { not: userId } },
              include: { user: { select: { id: true, name: true, photoUrl: true, customStatus: true } } },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return participations.map(p => {
      const conv = p.conversation;
      const otherParticipant = conv.participants[0]?.user;
      
      // Calculate unread count
      const lastReadAt = p.lastReadAt || p.joinedAt;
      
      return {
        id: conv.id,
        title: conv.isGroup ? conv.title : otherParticipant?.name,
        isGroup: conv.isGroup,
        photoUrl: conv.isGroup ? null : otherParticipant?.photoUrl,
        customStatus: conv.isGroup ? null : otherParticipant?.customStatus,
        lastMessage: conv.messages[0],
        unreadCount: 0, // In a real app we'd count messages since lastReadAt, keeping it simple for MVP or we can compute it.
        lastReadAt: p.lastReadAt,
        updatedAt: conv.updatedAt,
        partnerId: conv.isGroup ? null : otherParticipant?.id,
      };
    });
  }

  async getConversationMessages(conversationId: string, userId: string) {
    // Verify participation
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    
    if (!participant) {
      throw new NotFoundException('Conversation not found or you are not a participant');
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, photoUrl: true },
        },
      },
    });
  }

  async findOrCreateDirectConversation(user1Id: string, user2Id: string) {
    // Check if a direct conversation already exists between these two users
    const existingConvs = await this.prisma.conversation.findMany({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId: user1Id } } },
          { participants: { some: { userId: user2Id } } },
        ],
      },
    });

    if (existingConvs.length > 0) {
      return existingConvs[0];
    }

    // Create new
    return this.prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId: user1Id },
            { userId: user2Id },
          ],
        },
      },
    });
  }

  async saveMessage(conversationId: string, senderId: string, content: string) {
    // Save message
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
      },
      include: {
        sender: { select: { id: true, name: true, photoUrl: true } },
      },
    });

    // Update conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async updateLastRead(conversationId: string, userId: string) {
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
  }
}

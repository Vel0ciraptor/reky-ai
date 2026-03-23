import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  async sendMessage(data: {
    senderId: string;
    receiverId: string;
    content: string;
    roomId?: string;
  }) {
    // Validation: Contact sharing prevention
    const previousMsgs = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: data.senderId, receiverId: data.receiverId },
          { senderId: data.receiverId, receiverId: data.senderId },
        ],
      },
    });
    const senderCount = previousMsgs.filter(
      (m) => m.senderId === data.senderId,
    ).length;
    const receiverCount = previousMsgs.filter(
      (m) => m.senderId === data.receiverId,
    ).length;
    const canShareContact = senderCount >= 5 || receiverCount >= 5;

    if (!canShareContact) {
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i;
      const phoneRegex = /(?:\+?\d[\s-]?){7,}/; // at least 7 digits (with optional spaces/dashes)
      if (emailRegex.test(data.content) || phoneRegex.test(data.content)) {
        return {
          error:
            'Por seguridad, no puedes enviar correos electrónicos o números telefónicos hasta que al menos uno haya enviado 5 mensajes.',
        };
      }
    }

    // Deduct 1 Bs from sender wallet
    try {
      await this.walletService.deduct(data.senderId, 1);
    } catch {
      return {
        error:
          'Saldo insuficiente. Recarga tu wallet para seguir enviando mensajes.',
      };
    }

    const message = await this.prisma.message.create({
      data: {
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
      },
      include: {
        sender: {
          select: { id: true, name: true, lastName: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, name: true, lastName: true, avatarUrl: true },
        },
      },
    });

    return { message };
  }

  async getConversations(agentId: string) {
    // Fetch all messages where this agent is sender or receiver
    const allMessages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: agentId }, { receiverId: agentId }],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by conversation partner
    const convMap = new Map<
      string,
      {
        partnerId: string;
        partnerName: string;
        partnerAvatar: string | null;
        partnerRole: string;
        lastMessage: string;
        lastMessageTime: Date;
        unread: number;
      }
    >();

    for (const msg of allMessages) {
      const isMe = msg.senderId === agentId;
      const partner = isMe ? msg.receiver : msg.sender;

      if (!convMap.has(partner.id)) {
        convMap.set(partner.id, {
          partnerId: partner.id,
          partnerName: `${partner.name} ${partner.lastName}`,
          partnerAvatar: partner.avatarUrl,
          partnerRole: partner.role,
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          unread: 0, // TODO: implement read receipts
        });
      }
    }

    // Convert to array and sort by last message time
    return Array.from(convMap.values()).sort(
      (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime(),
    );
  }

  async getConversation(agentA: string, agentB: string) {
    const partnerInfo = await this.prisma.agent.findUnique({
      where: { id: agentB },
      select: {
        id: true,
        name: true,
        lastName: true,
        avatarUrl: true,
        role: true,
      },
    });

    if (!partnerInfo) throw new Error('Agente no encontrado');

    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: agentA, receiverId: agentB },
          { senderId: agentB, receiverId: agentA },
        ],
      },
      include: {
        sender: {
          select: { id: true, name: true, lastName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Count messages per side to determine if phone/email can be shared
    const senderCount = messages.filter((m) => m.senderId === agentA).length;
    const receiverCount = messages.filter((m) => m.senderId === agentB).length;
    const canShareContact = senderCount >= 5 || receiverCount >= 5;

    // If can share, fetch contact info
    let contactInfo: { phone: string; email: string } | null = null;
    if (canShareContact) {
      contactInfo = await this.prisma.agent.findUnique({
        where: { id: agentB },
        select: { phone: true, email: true },
      });
    }

    return { partnerInfo, messages, canShareContact, contactInfo };
  }
}

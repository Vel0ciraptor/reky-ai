import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { Resend } from 'resend';

@Injectable()
export class AgentsService {
  private resend: Resend | null = null;

  constructor(private prisma: PrismaService) {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  async findAll() {
    return this.prisma.agent.findMany({
      where: { role: { not: 'admin' } },
      select: {
        id: true,
        name: true,
        lastName: true,
        role: true,
        verified: true,
        points: true,
        avatarUrl: true,
        createdAt: true,
        agency: { select: { id: true, name: true } },
        _count: { select: { properties: { where: { enCoventa: false } } } },
      },
      orderBy: { points: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.agent.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        verified: true,
        points: true,
        createdAt: true,
        identityFront: true,
        identityBack: true,
        emailVerified: true,
        agency: true,
        wallet: true,
        properties: { include: { property: true } },
        _count: { select: { properties: { where: { enCoventa: false } }, transactions: true } },
      },
    });
  }

  async getLeaderboard() {
    return this.prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        lastName: true,
        points: true,
        role: true,
        agency: { select: { name: true } },
        _count: { select: { properties: { where: { enCoventa: false } }, transactions: true } },
      },
      orderBy: { points: 'desc' },
      take: 50,
    });
  }

  async uploadAvatar(agentId: string, avatarUrl: string) {
    return this.prisma.agent.update({
      where: { id: agentId },
      data: { avatarUrl },
    });
  }

  async uploadIdentity(agentId: string, frontUrl: string, backUrl: string) {
    return this.prisma.agent.update({
      where: { id: agentId },
      data: { identityFront: frontUrl, identityBack: backUrl },
    });
  }

  async sendVerificationEmail(agentId: string) {
    // Deshabilitado para pruebas: marcamos como verificado directamente
    await this.prisma.agent.update({
      where: { id: agentId },
      data: { emailVerified: true, verificationCode: null },
    });

    return { message: 'Cuenta verificada automáticamente (Modo Pruebas)' };
  }

  async verifyEmailCode(agentId: string, code: string) {
    // Siempre retornar éxito para pruebas
    await this.prisma.agent.update({
      where: { id: agentId },
      data: { emailVerified: true, verificationCode: null },
    });

    return { success: true, message: 'Correo verificado con éxito (Modo Pruebas)' };
  }

  async getMyProperties(agentId: string) {
    const relations = await this.prisma.propertyAgent.findMany({
      where: { agentId, enCoventa: false },
      include: {
        property: {
          include: { images: { orderBy: { orden: 'asc' }, take: 1 } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return relations.map((r) => ({
      id: r.property.id,
      descripcion: r.property.descripcion,
      ubicacion: r.property.ubicacion,
      tipo: r.property.tipo,
      precio: r.property.precio,
      alquilado: r.property.alquilado,
      tiempoAlquiler: r.property.tiempoAlquiler,
      tiempoAnticretico: r.property.tiempoAnticretico,
      image: r.property.images[0]?.url || null,
      promocionado: r.promocionado,
      enCoventa: r.enCoventa,
    }));
  }

  async updateProfile(agentId: string, data: { name?: string; lastName?: string; phone?: string }) {
    return this.prisma.agent.update({ where: { id: agentId }, data });
  }
}

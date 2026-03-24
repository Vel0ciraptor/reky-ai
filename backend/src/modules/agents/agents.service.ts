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
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const agent = await this.prisma.agent.update({
      where: { id: agentId },
      data: { verificationCode: code },
      select: { email: true, name: true },
    });

    if (this.resend) {
      try {
        const { error } = await this.resend.emails.send({
          from: 'Reky AI <onboarding@resend.dev>',
          to: agent.email,
          subject: 'Tu código de verificación - Reky AI',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px;
              border-radius: 12px; border: 1px solid #eee; background: #FAFAFA; text-align: center;">
              <h2 style="color: #FF5A1F;">Reky AI — Verificación de Cuenta</h2>
              <p style="color: #555; font-size: 15px;">
                Hola <strong>${agent.name}</strong>, usa este código para verificar tu correo:
              </p>
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px;
                color: #FF5A1F; padding: 20px 0;">${code}</div>
              <p style="color: #999; font-size: 12px;">
                Válido por 15 minutos. Si no lo solicitaste, ignora este mensaje.
              </p>
            </div>
          `,
        });
        if (error) console.error('❌ Resend error (agents):', error);
      } catch (err) {
        console.error('No se pudo enviar el correo de verificación:', err);
      }
    } else {
      // Development fallback — print code so devs can test without Resend
      console.log(`[DEV] Verification code for ${agent.email}: ${code}`);
    }

    return { message: 'Código enviado al correo' };
  }

  async verifyEmailCode(agentId: string, code: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { verificationCode: true, emailVerified: true },
    });

    if (!agent) throw new Error('Agente no encontrado');
    if (agent.emailVerified) return { success: true, message: 'El correo ya fue verificado' };
    if (agent.verificationCode !== code) throw new Error('Código incorrecto');

    await this.prisma.agent.update({
      where: { id: agentId },
      data: { emailVerified: true, verificationCode: null },
    });

    return { success: true, message: 'Correo verificado con éxito' };
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
      matricula: r.property.matricula,
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

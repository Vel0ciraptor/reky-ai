import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class AgentsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.agent.findMany({
            select: {
                id: true, name: true, lastName: true, email: true,
                phone: true, role: true, verified: true, points: true,
                createdAt: true, agency: { select: { id: true, name: true } },
                _count: { select: { properties: true } },
            },
            orderBy: { points: 'desc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.agent.findUnique({
            where: { id },
            select: {
                id: true, name: true, lastName: true, email: true, phone: true,
                role: true, verified: true, points: true, createdAt: true,
                identityFront: true, identityBack: true, emailVerified: true,
                agency: true, wallet: true,
                properties: {
                    include: { property: true },
                },
                _count: { select: { properties: true, transactions: true } },
            },
        });
    }

    async getLeaderboard() {
        return this.prisma.agent.findMany({
            select: {
                id: true, name: true, lastName: true, points: true, role: true,
                agency: { select: { name: true } },
                _count: { select: { properties: true, transactions: true } },
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
            data: {
                identityFront: frontUrl,
                identityBack: backUrl,
            },
        });
    }

    async sendVerificationEmail(agentId: string) {
        // Generate a 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await this.prisma.agent.update({
            where: { id: agentId },
            data: { verificationCode: code },
        });

        // In a real app, send email here via SendGrid/Nodemailer
        console.log(`[EMAIL MOCK] Verification code for agent ${agentId} is: ${code}`);
        return { message: 'Código enviado al correo' };
    }

    async verifyEmailCode(agentId: string, code: string) {
        const agent = await this.prisma.agent.findUnique({
            where: { id: agentId },
            select: { verificationCode: true, emailVerified: true }
        });

        if (!agent) {
            throw new Error('Agente no encontrado');
        }

        if (agent.emailVerified) {
            return { success: true, message: 'El correo ya fue verificado' };
        }

        if (agent.verificationCode !== code) {
            throw new Error('Código incorrecto');
        }

        await this.prisma.agent.update({
            where: { id: agentId },
            data: {
                emailVerified: true,
                verificationCode: null, // Clear code after success
            },
        });

        return { success: true, message: 'Correo verificado con éxito' };
    }

    async getMyProperties(agentId: string) {
        const relations = await this.prisma.propertyAgent.findMany({
            where: { agentId },
            include: {
                property: {
                    include: {
                        images: { orderBy: { orden: 'asc' }, take: 1 },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return relations.map(r => ({
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
        return this.prisma.agent.update({
            where: { id: agentId },
            data,
        });
    }
}

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infra/database/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        const exists = await this.prisma.agent.findUnique({ where: { email: dto.email } });
        if (exists) throw new ConflictException('Este correo ya está registrado.');

        const hashed = await bcrypt.hash(dto.password, 12);

        const agent = await this.prisma.agent.create({
            data: {
                name: dto.name,
                lastName: dto.lastName,
                email: dto.email,
                password: hashed,
                phone: dto.phone,
                role: dto.role ?? 'agente',
                // agencyId is NOT set here — agent stays independent until agency accepts
            },
        });

        // Create wallet for new agent
        await this.prisma.wallet.create({ data: { agentId: agent.id, balance: 0 } });

        // If the agent selected an agency during registration, create a pending request
        if (dto.agencyId && dto.role !== 'agencia') {
            const agency = await this.prisma.agency.findUnique({ where: { id: dto.agencyId } });
            if (agency) {
                await this.prisma.agencyRequest.create({
                    data: {
                        agentId: agent.id,
                        agencyId: dto.agencyId,
                        type: 'request',
                        status: 'pending',
                    },
                });
            }
        }

        const token = this.signToken(agent.id, agent.email, agent.role);
        return { agent: this.sanitize(agent), token };
    }

    async login(dto: LoginDto) {
        const agent = await this.prisma.agent.findUnique({ where: { email: dto.email } });
        if (!agent) throw new UnauthorizedException('Credenciales inválidas.');

        const valid = await bcrypt.compare(dto.password, agent.password);
        if (!valid) throw new UnauthorizedException('Credenciales inválidas.');

        const token = this.signToken(agent.id, agent.email, agent.role);
        return { agent: this.sanitize(agent), token };
    }

    async me(agentId: string) {
        const agent = await this.prisma.agent.findUnique({
            where: { id: agentId },
            include: {
                wallet: true,
                agency: true,
                _count: { select: { properties: true, transactions: true } },
            },
        });
        if (!agent) throw new UnauthorizedException();
        return this.sanitize(agent);
    }

    private signToken(id: string, email: string, role: string) {
        return this.jwt.sign({ sub: id, email, role });
    }

    private sanitize(agent: any) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...rest } = agent;
        return rest;
    }
}

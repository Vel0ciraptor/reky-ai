import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';

@Injectable()
export class RequirementsService {
    constructor(private prisma: PrismaService) { }

    async create(agentId: string, dto: CreateRequirementDto) {
        return this.prisma.requirement.create({
            data: {
                agentId,
                description: dto.description,
                propertyType: dto.propertyType,
                tipoVivienda: dto.tipoVivienda,
                ubicacion: dto.ubicacion,
                minBudget: dto.minBudget,
                maxBudget: dto.maxBudget,
                dormitorios: dto.dormitorios,
                banos: dto.banos,
                estacionamiento: dto.estacionamiento ?? false,
                patio: dto.patio ?? false,
                piscina: dto.piscina ?? false,
                mascotas: dto.mascotas ?? false,
                terreno: dto.terreno,
                construccion: dto.construccion,
                tiempoAlquiler: dto.tiempoAlquiler,
                tiempoAnticretico: dto.tiempoAnticretico,
                tags: dto.tags ?? [],
            },
            include: { agent: true }
        });
    }

    async findAll() {
        return this.prisma.requirement.findMany({
            orderBy: { createdAt: 'desc' },
            include: { agent: true }
        });
    }

    async findByAgent(agentId: string) {
        return this.prisma.requirement.findMany({
            where: { agentId },
            orderBy: { createdAt: 'desc' },
            include: { agent: true }
        });
    }

    async remove(id: string, agentId: string) {
        const req = await this.prisma.requirement.findUnique({ where: { id } });
        if (!req || req.agentId !== agentId) {
            throw new NotFoundException('Requerimiento no encontrado o no te pertenece');
        }
        return this.prisma.requirement.delete({ where: { id } });
    }
}

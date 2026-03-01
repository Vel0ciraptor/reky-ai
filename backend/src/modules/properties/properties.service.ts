import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class PropertiesService {
    constructor(
        private prisma: PrismaService,
        private walletService: WalletService
    ) { }

    async create(createPropertyDto: CreatePropertyDto, agentId: string) {
        const { matricula, tags, images, ...data } = createPropertyDto;

        // Try to deduct 1 bs first
        await this.walletService.deduct(agentId, 1);
        try {
            // Check if property with matricula exists
            const existingProperty = await this.prisma.property.findUnique({
                where: { matricula },
            });

            if (existingProperty) {
                // Check if property is already assigned to this agent
                const linkedAgent = await this.prisma.propertyAgent.findUnique({
                    where: {
                        propertyId_agentId: {
                            propertyId: existingProperty.id,
                            agentId: agentId,
                        }
                    }
                });

                if (linkedAgent) {
                    throw new ConflictException('Ya gestionas esta propiedad.');
                }

                // Assign property to agent (Co-venta logic)
                return await this.prisma.propertyAgent.create({
                    data: {
                        propertyId: existingProperty.id,
                        agentId: agentId,
                        enCoventa: true,
                    },
                    include: { property: true }
                });
            }

            // Create new property with tags and images
            return await this.prisma.property.create({
                data: {
                    matricula,
                    ...data,
                    agents: {
                        create: {
                            agentId: agentId,
                            enCoventa: false,
                        }
                    },
                    images: images?.length ? {
                        create: images.map((url, index) => ({
                            url,
                            orden: index,
                        }))
                    } : undefined,
                    tags: tags?.length ? {
                        create: await Promise.all(tags.map(async (tagName) => {
                            // Get or create the tag first
                            const tag = await this.prisma.tag.upsert({
                                where: { name: tagName.toLowerCase() },
                                update: {},
                                create: { name: tagName.toLowerCase() },
                            });
                            return { tagId: tag.id };
                        }))
                    } : undefined,
                },
                include: {
                    agents: true,
                    images: true,
                    tags: { include: { tag: true } }
                }
            });
        } catch (error: any) {
            // Revert the transaction if DB insertion failed (e.g. constraints, unique index, missing data)
            await this.walletService.deposit(agentId, 1);
            if (error instanceof ConflictException) throw error;
            console.error('Property creation error:', error);
            throw new BadRequestException('Error al crear la propiedad: Verifique los campos ingresados. ' + (error.message || ''));
        }
    }

    async findAll() {
        return this.prisma.property.findMany({
            include: {
                agents: {
                    include: {
                        agent: {
                            select: {
                                name: true,
                                lastName: true,
                                phone: true,
                            }
                        }
                    }
                },
                tags: true,
            }
        });
    }

    async findOne(id: string) {
        const property = await this.prisma.property.findUnique({
            where: { id },
            include: {
                images: true,
                tags: { include: { tag: true } },
                agents: {
                    include: {
                        agent: {
                            include: { agency: true }
                        }
                    }
                }
            }
        });

        if (!property) throw new NotFoundException('Propiedad no encontrada');
        return property;
    }

    async updateProperty(id: string, data: { precio?: number; alquilado?: boolean; tiempoAlquiler?: number | null; tiempoAnticretico?: number | null }) {
        const property = await this.prisma.property.findUnique({ where: { id } });
        if (!property) throw new NotFoundException('Propiedad no encontrada');

        return this.prisma.property.update({
            where: { id },
            data: {
                ...(data.precio !== undefined && { precio: data.precio }),
                ...(data.alquilado !== undefined && { alquilado: data.alquilado }),
                ...(data.tiempoAlquiler !== undefined && { tiempoAlquiler: data.tiempoAlquiler }),
                ...(data.tiempoAnticretico !== undefined && { tiempoAnticretico: data.tiempoAnticretico }),
            },
        });
    }
}

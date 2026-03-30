import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class PropertiesService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) { }

  async create(createPropertyDto: CreatePropertyDto & { id?: string }, agentId: string) {
    const { tags, images, id, ...data } = createPropertyDto;

    // Try to deduct 1 bs first
    await this.walletService.deduct(agentId, 1);
    try {
      // Create new property with tags and images
      return await this.prisma.property.create({
        data: {
          id: id,
          ...data,
          agents: {
            create: {
              agentId: agentId,
              enCoventa: false,
            },
          },
          images: images?.length
            ? {
              create: images.map((url, index) => ({
                url,
                orden: index,
              })),
            }
            : undefined,
          tags: tags?.length
            ? {
              create: await Promise.all(
                tags.map(async (tagName) => {
                  // Get or create the tag first
                  const tag = await this.prisma.tag.upsert({
                    where: { name: tagName.toLowerCase() },
                    update: {},
                    create: { name: tagName.toLowerCase() },
                  });
                  return { tagId: tag.id };
                }),
              ),
            }
            : undefined,
        },
        include: {
          agents: true,
          images: true,
          tags: { include: { tag: true } },
        },
      });
    } catch (error: any) {
      // Revert the transaction if DB insertion failed
      await this.walletService.deposit(agentId, 1);
      console.error('Property creation error:', error);
      throw new BadRequestException(
        'Error al crear la propiedad: Verifique los campos ingresados. ' +
        (error.message || ''),
      );
    }
  }

  async findAll() {
    return this.prisma.property.findMany({
      where: { isDemo: false },
      include: {
        agents: {
          include: {
            agent: {
              select: {
                name: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        tags: true,
      },
    });
  }

  async findAllIncludingDemo() {
    // Admin-only: returns everything
    return this.prisma.property.findMany({
      include: {
        agents: { include: { agent: { select: { name: true, lastName: true } } } },
        images: { orderBy: { orden: 'asc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleDemo(id: string) {
    const prop = await this.prisma.property.findUnique({ where: { id } });
    if (!prop) throw new NotFoundException('Propiedad no encontrada');
    return this.prisma.property.update({
      where: { id },
      data: { isDemo: !prop.isDemo },
      select: { id: true, isDemo: true, descripcion: true, ubicacion: true },
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
              include: { agency: true },
            },
          },
        },
      },
    });

    if (!property) throw new NotFoundException('Propiedad no encontrada');
    return property;
  }

  async updateProperty(
    id: string,
    data: {
      precio?: number;
      alquilado?: boolean;
      tiempoAlquiler?: number | null;
      tiempoAnticretico?: number | null;
    },
  ) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Propiedad no encontrada');

    return this.prisma.property.update({
      where: { id },
      data: {
        ...(data.precio !== undefined && { precio: data.precio }),
        ...(data.alquilado !== undefined && { alquilado: data.alquilado }),
        ...(data.tiempoAlquiler !== undefined && {
          tiempoAlquiler: data.tiempoAlquiler,
        }),
        ...(data.tiempoAnticretico !== undefined && {
          tiempoAnticretico: data.tiempoAnticretico,
        }),
      },
    });
  }
  async deleteProperty(id: string, agentId: string, isAdmin: boolean) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: { agents: true },
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada');
    const isOwner = property.agents.some((a) => a.agentId === agentId);
    if (!isOwner && !isAdmin)
      throw new ForbiddenException('No tienes permiso para eliminar esta propiedad');

    // Delete related records first
    await this.prisma.propertyImage.deleteMany({ where: { propertyId: id } });
    await this.prisma.propertyTag.deleteMany({ where: { propertyId: id } });
    await this.prisma.propertyAgent.deleteMany({ where: { propertyId: id } });
    await this.prisma.transaction.deleteMany({ where: { propertyId: id } });
    return this.prisma.property.delete({ where: { id } });
  }
}

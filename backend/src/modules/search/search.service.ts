import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) { }

  async search(filters: {
    tipo?: string;
    minPrecio?: number;
    maxPrecio?: number;
    dormitorios?: number;
    banos?: number;
    estacionamiento?: boolean;
    piscina?: boolean;
    patio?: boolean;
    q?: string;
    minLat?: number;
    maxLat?: number;
    minLng?: number;
    maxLng?: number;
    mascotas?: boolean;
    tipoVivienda?: string;
    terrenoMin?: number;
    terrenoMax?: number;
    construccionMin?: number;
    construccionMax?: number;
    page?: number;
    limit?: number;
  }) {
    const where: any = { isDemo: false }; // always exclude demo/seed properties

    if (filters.tipo) where.tipo = filters.tipo;

    if (filters.dormitorios)
      where.dormitorios = { gte: Number(filters.dormitorios) };
    if (filters.banos) where.banos = { gte: Number(filters.banos) };
    if (
      String(filters.estacionamiento) === 'true' ||
      filters.estacionamiento === true
    )
      where.estacionamiento = true;
    if (String(filters.piscina) === 'true' || filters.piscina === true)
      where.piscina = true;
    if (String(filters.patio) === 'true' || filters.patio === true)
      where.patio = true;

    // Price range (both min and max supported)
    if (filters.minPrecio || filters.maxPrecio) {
      where.precio = {};
      if (filters.minPrecio) where.precio.gte = Number(filters.minPrecio);
      if (filters.maxPrecio) where.precio.lte = Number(filters.maxPrecio);
    }

    // Bounding box filter
    if (
      filters.minLat !== undefined &&
      filters.maxLat !== undefined &&
      filters.minLng !== undefined &&
      filters.maxLng !== undefined
    ) {
      where.lat = { gte: Number(filters.minLat), lte: Number(filters.maxLat) };
      where.lng = { gte: Number(filters.minLng), lte: Number(filters.maxLng) };
    }

    if (String(filters.mascotas) === 'true' || filters.mascotas === true)
      where.mascotas = true;

    if (filters.tipoVivienda) {
      where.tipoVivienda = {
        contains: filters.tipoVivienda,
        mode: 'insensitive',
      };
    }

    // Terreno range
    if (filters.terrenoMin || filters.terrenoMax) {
      where.terreno = {};
      if (filters.terrenoMin) where.terreno.gte = Number(filters.terrenoMin);
      if (filters.terrenoMax) where.terreno.lte = Number(filters.terrenoMax);
    }

    // Construccion range
    if (filters.construccionMin || filters.construccionMax) {
      where.construccion = {};
      if (filters.construccionMin)
        where.construccion.gte = Number(filters.construccionMin);
      if (filters.construccionMax)
        where.construccion.lte = Number(filters.construccionMax);
    }

    // Full text search: descripcion, ubicacion, tags
    if (filters.q) {
      where.OR = [
        { descripcion: { contains: filters.q, mode: 'insensitive' } },
        { ubicacion: { contains: filters.q, mode: 'insensitive' } },
        {
          tags: {
            some: {
              tag: { name: { contains: filters.q, mode: 'insensitive' } },
            },
          },
        },
      ];
    }

    const limit = Math.min(Number(filters.limit) || 1000, 1200);
    const page = Math.max(Number(filters.page) || 1, 1);
    const skip = (page - 1) * limit;

    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        include: {
          agents: {
            include: {
              agent: {
                select: {
                  id: true, name: true, lastName: true,
                  phone: true, points: true,
                  agency: { select: { name: true } },
                },
              },
            },
            orderBy: { promocionado: 'desc' },
          },
          tags: { include: { tag: { select: { name: true } } } },
          images: { orderBy: { orden: 'asc' }, take: 3 },
          _count: { select: { agents: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.property.count({ where }),
    ]);

    // Promoted properties float to top within the page
    const sorted = properties.sort((a, b) => {
      const aP = a.agents.some((ag) => ag.promocionado) ? 1 : 0;
      const bP = b.agents.some((ag) => ag.promocionado) ? 1 : 0;
      return bP - aP;
    });

    return {
      data: sorted,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    };
  }
}

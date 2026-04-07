import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(private prisma: PrismaService) {}

  async createCaptador(data: {
    nombre: string;
    telefono: string;
    zonaTrabajo: string;
    tipo: string;
  }) {
    return this.prisma.captador.create({
      data: {
        nombre: data.nombre,
        telefono: data.telefono,
        zonaTrabajo: data.zonaTrabajo,
        tipo: data.tipo,
      },
    });
  }

  async createRequerimiento(data: {
    titulo: string;
    tipoOperacion: string;
    tipoPropiedad: string;
    presupuestoMin: number;
    presupuestoMax: number;
    zona: string;
    habitaciones: number;
    descripcion: string;
    prioridad?: string;
  }) {
    const requirement = await this.prisma.requerimiento.create({
      data: {
        titulo: data.titulo,
        tipoOperacion: data.tipoOperacion,
        tipoPropiedad: data.tipoPropiedad,
        presupuestoMin: new Prisma.Decimal(data.presupuestoMin),
        presupuestoMax: new Prisma.Decimal(data.presupuestoMax),
        zona: data.zona,
        habitaciones: data.habitaciones,
        descripcion: data.descripcion,
        prioridad: data.prioridad || 'media',
      },
    });

    // Trigger matching engine in background using setImmediate to ensure total decoupling
    setImmediate(() => {
        this.runMatchingEngine(requirement.id).catch(err => {
            this.logger.error(`Matching engine background failed for ${requirement.id}`, err);
        });
    });

    return requirement;
  }

  async runMatchingEngine(requirementId: string) {
    const req = await this.prisma.requerimiento.findUnique({
      where: { id: requirementId },
    });

    if (!req) return;

    // 1. Get all active captadores
    // In a real app, we might also check if they have properties.
    // Assuming Captador might be related to Agent if we want to check Properties.
    // For now, let's treat Captador as the main entity.
    
    // NOTE: The specification only lists Captador, Requerimiento and Match.
    // But the logic refers to properties (zona, presupuesto, tipo_propiedad, habitaciones).
    // Let's assume for this "base structure" that matching logic is applied against
    // the EXISTING Property model in the database, and we map Captador to Agent.
    
    // For this demonstration, I'll fetch Agents who have a corresponding Captador profile
    // OR I will just match against all Agents and consider them "Captadores" conceptually.
    // Actually, I'll use the NEW Captador table as the target for Matches.
    
    // 1. Get all active properties that are not demo and match the operation type
    const properties = await this.prisma.property.findMany({
        where: {
            status: 'disponible',
            isDemo: false,
            tipo: req.tipoOperacion === 'alquiler' ? 'alquiler' : 'venta',
        },
        include: {
            agents: { include: { agent: true } }
        }
    });

    for (const prop of properties) {
        let pts = 0;
        
        // +30 si zona coincide
        if (prop.ubicacion === req.zona) pts += 30;
        
        // +25 si presupuesto compatible
        const price = Number(prop.precio);
        if (price >= Number(req.presupuestoMin) && price <= Number(req.presupuestoMax)) {
            pts += 25;
        }
        
        // +15 si tipo_propiedad coincide
        if (prop.tipoVivienda?.toLowerCase().includes(req.tipoPropiedad.toLowerCase())) {
            pts += 15;
        }

        // +10 si habitaciones coincide
        if (prop.dormitorios === req.habitaciones) {
            pts += 10;
        }

        // If it's a good match (> 50 pts), we check if we have a captador/agent for it
        if (pts >= 50) {
            const firstAgent = prop.agents[0]?.agent;
            
            await this.prisma.match.upsert({
                where: {
                    captadorId_requerimientoId_propertyId: {
                        captadorId: null, // We match by property now
                        requerimientoId: req.id,
                        propertyId: prop.id
                    }
                },
                create: {
                    requerimientoId: req.id,
                    propertyId: prop.id,
                    scoreMatch: pts,
                    estado: 'nuevo',
                    notas: `Match con la propiedad en ${prop.ubicacion}`
                },
                update: {
                    scoreMatch: pts
                }
            });
            
            this.logger.log(`Created property match: ${prop.id} with score ${pts}`);
        }
    }
  }

  async getMatchesForRequirement(requirementId: string) {
      return this.prisma.match.findMany({
          where: { requerimientoId: requirementId },
          include: { captador: true },
          orderBy: { scoreMatch: 'desc' }
      });
  }

  async updateMatchStatus(matchId: string, estado: string) {
      return this.prisma.match.update({
          where: { id: matchId },
          data: { estado }
      });
  }

  async findAllRequirements() {
      return this.prisma.requerimiento.findMany({
          orderBy: { createdAt: 'desc' },
          include: { matches: { include: { captador: true } } }
      });
  }
}

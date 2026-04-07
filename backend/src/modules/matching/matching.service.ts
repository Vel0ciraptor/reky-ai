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
    
    const captadores = await this.prisma.captador.findMany({
        where: { activo: true }
    });

    for (const captador of captadores) {
      let score = 0;

      // Base: zona de trabajo profile info
      if (captador.zonaTrabajo === req.zona) {
        score += 20; // +20 si captador trabaja en esa zona
      }

      // To implement the other points, we need properties.
      // Let's check if this captador is linked to an Agent to find their properties.
      // Since the new schema didn't include agentId, I'll allow a fuzzy match by phone or name,
      // or assume the Agent created the Captador profile.
      
      // FOR NOW, let's implement the logic assuming we can find properties for this captador.
      // I'll find properties where the 'location' (ubicacion) matches the requirement zone, etc.
      
      // Let's find properties managed by the Agent associated with this Captador (if we can find one)
      // or just properties in general that match, and then identify their owners.
      
      // NEW PROPOSED LOGIC:
      // A Match is between a Requerimiento and a Captador.
      // To get the score, we find the BEST property of that Captador that matches the Requerimiento.

      // Let's check if the Captador has a linked Agent first. 
      // I'll assume for simplicity that we match based on the Captador's "specialty" 
      // if they don't have properties, OR we search the Property table.
      
      // But the requirement says "+30 if zona matches", "+25 if budget compat", etc.
      // These ARE property-specific checks.

      // If we don't have a direct link in the schema yet, I'll look for properties 
      // belonging to an Agent with the same name or phone as the Captador.
      
      const agent = await this.prisma.agent.findFirst({
          where: {
              OR: [
                  { phone: captador.telefono },
                  { name: { contains: captador.nombre } }
              ]
          }
      });

      if (agent) {
          const properties = await this.prisma.property.findMany({
              where: {
                  agents: {
                      some: { agentId: agent.id }
                  },
                  tipo: req.tipoOperacion === 'alquiler' ? 'alquiler' : 'venta'
              }
          });

          let maxPropertyPoints = 0;
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
              
              if (pts > maxPropertyPoints) maxPropertyPoints = pts;
          }
          score += maxPropertyPoints;
      }

      // Cap score at 100
      score = Math.min(score, 100);

      if (score > 0) {
          await this.prisma.match.upsert({
              where: {
                  captadorId_requerimientoId: {
                      captadorId: captador.id,
                      requerimientoId: req.id
                  }
              },
              create: {
                  captadorId: captador.id,
                  requerimientoId: req.id,
                  scoreMatch: score,
                  estado: 'nuevo'
              },
              update: {
                  scoreMatch: score
              }
          });
          
          this.logger.log(`Created match for Captador ${captador.nombre} with score ${score}`);
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

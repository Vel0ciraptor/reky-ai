import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class AgenciesService {
  constructor(private prisma: PrismaService) { }

  /**
   * List all agencies (for registration dropdown)
   */
  async listAll() {
    return this.prisma.agency.findMany({
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get agency dashboard: stats + team + pending requests
   */
  async getDashboard(agentId: string) {
    const requester = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        role: true,
        agencyId: true,
        name: true,
        lastName: true,
      },
    });

    if (!requester || requester.role !== 'agencia') {
      throw new ForbiddenException(
        'Solo las agencias pueden acceder a este panel.',
      );
    }

    // Auto-create agency if agencia role but no agency linked
    let agencyId = requester.agencyId;
    if (!agencyId) {
      const agency = await this.prisma.agency.create({
        data: { name: `${requester.name} ${requester.lastName}` },
      });
      await this.prisma.agent.update({
        where: { id: agentId },
        data: { agencyId: agency.id },
      });
      agencyId = agency.id;
    }

    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      select: { id: true, name: true, logoUrl: true, createdAt: true },
    });

    // Current team members (accepted into agency)
    const agents = await this.prisma.agent.findMany({
      where: { agencyId },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        verified: true,
        emailVerified: true,
        points: true,
        avatarUrl: true,
        createdAt: true,
        wallet: { select: { balance: true } },
        _count: { select: { properties: { where: { enCoventa: false } }, transactions: true } },
      },
      orderBy: { points: 'desc' },
    });

    // Pending requests (agents who want to join)
    const pendingRequests = await this.prisma.agencyRequest.findMany({
      where: { agencyId, status: 'pending', type: 'request' },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            points: true,
            _count: { select: { properties: { where: { enCoventa: false } }, transactions: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Pending invitations (agency sent to independent agents)
    const pendingInvitations = await this.prisma.agencyRequest.findMany({
      where: { agencyId, status: 'pending', type: 'invitation' },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate stats
    const totalProperties = agents.reduce(
      (sum, a) => sum + (a._count?.properties ?? 0),
      0,
    );
    const totalTransactions = agents.reduce(
      (sum, a) => sum + (a._count?.transactions ?? 0),
      0,
    );
    const totalPoints = agents.reduce((sum, a) => sum + a.points, 0);
    const totalBalance = agents.reduce(
      (sum, a) => sum + Number(a.wallet?.balance ?? 0),
      0,
    );

    return {
      agency,
      agents,
      pendingRequests,
      pendingInvitations,
      stats: {
        totalAgents: agents.length,
        totalProperties,
        totalTransactions,
        totalPoints,
        totalBalance,
        pendingCount: pendingRequests.length,
      },
    };
  }

  /**
   * Agent requests to join an agency (called during registration or later)
   */
  async requestToJoin(agentId: string, agencyId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { role: true, agencyId: true },
    });

    if (!agent) throw new NotFoundException('Agente no encontrado.');
    if (agent.agencyId)
      throw new ConflictException('Ya perteneces a una agencia.');

    // Check if agency exists
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
    });
    if (!agency) throw new NotFoundException('Agencia no encontrada.');

    // Check for existing request
    const existing = await this.prisma.agencyRequest.findUnique({
      where: { agentId_agencyId: { agentId, agencyId } },
    });
    if (existing) {
      if (existing.status === 'pending')
        throw new ConflictException('Ya tienes una solicitud pendiente.');
      // If rejected, allow re-request by updating
      await this.prisma.agencyRequest.update({
        where: { id: existing.id },
        data: { status: 'pending', createdAt: new Date() },
      });
      return { message: 'Solicitud reenviada.' };
    }

    await this.prisma.agencyRequest.create({
      data: { agentId, agencyId, type: 'request', status: 'pending' },
    });

    return { message: 'Solicitud enviada. La agencia debe aprobarla.' };
  }

  /**
   * Agency accepts a request (agent joins the team)
   */
  async acceptRequest(requesterId: string, requestId: string) {
    const requester = await this.prisma.agent.findUnique({
      where: { id: requesterId },
      select: { role: true, agencyId: true },
    });
    if (!requester || requester.role !== 'agencia') {
      throw new ForbiddenException(
        'Solo las agencias pueden aceptar solicitudes.',
      );
    }

    const request = await this.prisma.agencyRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.agencyId !== requester.agencyId) {
      throw new NotFoundException('Solicitud no encontrada.');
    }
    if (request.status !== 'pending') {
      throw new ConflictException('Esta solicitud ya fue procesada.');
    }

    // Accept: update request status and assign agent to agency
    await this.prisma.$transaction([
      this.prisma.agencyRequest.update({
        where: { id: requestId },
        data: { status: 'accepted' },
      }),
      this.prisma.agent.update({
        where: { id: request.agentId },
        data: { agencyId: requester.agencyId },
      }),
    ]);

    return { message: 'Agente aceptado en la agencia.' };
  }

  /**
   * Agency rejects a request
   */
  async rejectRequest(requesterId: string, requestId: string) {
    const requester = await this.prisma.agent.findUnique({
      where: { id: requesterId },
      select: { role: true, agencyId: true },
    });
    if (!requester || requester.role !== 'agencia') {
      throw new ForbiddenException(
        'Solo las agencias pueden rechazar solicitudes.',
      );
    }

    const request = await this.prisma.agencyRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.agencyId !== requester.agencyId) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    await this.prisma.agencyRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' },
    });

    return { message: 'Solicitud rechazada.' };
  }

  /**
   * Agency invites an existing independent agent by email
   */
  async inviteAgent(requesterId: string, email: string) {
    const requester = await this.prisma.agent.findUnique({
      where: { id: requesterId },
      select: { role: true, agencyId: true },
    });

    if (!requester || requester.role !== 'agencia' || !requester.agencyId) {
      throw new ForbiddenException('Solo las agencias pueden invitar agentes.');
    }

    // Find target agent by email
    const target = await this.prisma.agent.findUnique({ where: { email } });
    if (!target)
      throw new NotFoundException('No existe un agente con ese correo.');
    if (target.agencyId)
      throw new ConflictException('Este agente ya pertenece a una agencia.');
    if (target.role === 'agencia')
      throw new ConflictException('No puedes invitar a otra agencia.');

    // Check for existing request/invitation
    const existing = await this.prisma.agencyRequest.findUnique({
      where: {
        agentId_agencyId: { agentId: target.id, agencyId: requester.agencyId },
      },
    });
    if (existing) {
      if (existing.status === 'pending')
        throw new ConflictException(
          'Ya existe una solicitud/invitación pendiente.',
        );
      // Update if previously rejected
      await this.prisma.agencyRequest.update({
        where: { id: existing.id },
        data: { status: 'pending', type: 'invitation', createdAt: new Date() },
      });
      return {
        message: `Invitación reenviada a ${target.name} ${target.lastName}.`,
      };
    }

    await this.prisma.agencyRequest.create({
      data: {
        agentId: target.id,
        agencyId: requester.agencyId,
        type: 'invitation',
        status: 'pending',
      },
    });

    return {
      message: `Invitación enviada a ${target.name} ${target.lastName}.`,
    };
  }

  /**
   * Search independent agents (for invite autocomplete)
   */
  async searchIndependentAgents(query: string) {
    if (!query || query.length < 2) return [];
    return this.prisma.agent.findMany({
      where: {
        agencyId: null,
        role: 'agente',
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        avatarUrl: true,
        points: true,
        _count: { select: { properties: { where: { enCoventa: false } } } },
      },
      take: 10,
    });
  }

  /**
   * Agent accepts an invitation from an agency
   */
  async acceptInvitation(agentId: string, requestId: string) {
    const request = await this.prisma.agencyRequest.findUnique({
      where: { id: requestId },
    });
    if (
      !request ||
      request.agentId !== agentId ||
      request.type !== 'invitation'
    ) {
      throw new NotFoundException('Invitación no encontrada.');
    }
    if (request.status !== 'pending') {
      throw new ConflictException('Esta invitación ya fue procesada.');
    }

    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { agencyId: true },
    });
    if (agent?.agencyId)
      throw new ConflictException('Ya perteneces a una agencia.');

    await this.prisma.$transaction([
      this.prisma.agencyRequest.update({
        where: { id: requestId },
        data: { status: 'accepted' },
      }),
      this.prisma.agent.update({
        where: { id: agentId },
        data: { agencyId: request.agencyId },
      }),
    ]);

    return { message: 'Te has unido a la agencia.' };
  }

  /**
   * Agent rejects an invitation
   */
  async rejectInvitation(agentId: string, requestId: string) {
    const request = await this.prisma.agencyRequest.findUnique({
      where: { id: requestId },
    });
    if (
      !request ||
      request.agentId !== agentId ||
      request.type !== 'invitation'
    ) {
      throw new NotFoundException('Invitación no encontrada.');
    }

    await this.prisma.agencyRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' },
    });

    return { message: 'Invitación rechazada.' };
  }

  /**
   * Get pending invitations for an agent (to show in their profile)
   */
  async getMyInvitations(agentId: string) {
    return this.prisma.agencyRequest.findMany({
      where: { agentId, type: 'invitation', status: 'pending' },
      include: {
        agency: { select: { id: true, name: true, logoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Remove an agent from the agency
   */
  async removeAgent(requesterId: string, agentId: string) {
    const requester = await this.prisma.agent.findUnique({
      where: { id: requesterId },
      select: { role: true, agencyId: true },
    });
    if (!requester || requester.role !== 'agencia') {
      throw new ForbiddenException(
        'Solo las agencias pueden gestionar agentes.',
      );
    }

    const target = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { agencyId: true },
    });
    if (!target) throw new NotFoundException('Agente no encontrado.');
    if (target.agencyId !== requester.agencyId) {
      throw new ForbiddenException('Este agente no pertenece a tu agencia.');
    }

    await this.prisma.agent.update({
      where: { id: agentId },
      data: { agencyId: null },
    });

    return { message: 'Agente removido de la agencia.' };
  }

  /**
   * Get all properties managed by agents of this agency
   */
  async getAgencyProperties(requesterId: string) {
    const requester = await this.prisma.agent.findUnique({
      where: { id: requesterId },
      select: { role: true, agencyId: true },
    });
    if (!requester || requester.role !== 'agencia' || !requester.agencyId) {
      throw new ForbiddenException('Acceso denegado.');
    }

    const agentIds = await this.prisma.agent.findMany({
      where: { agencyId: requester.agencyId },
      select: { id: true },
    });

    const relations = await this.prisma.propertyAgent.findMany({
      where: { agentId: { in: agentIds.map((a) => a.id) } },
      include: {
        property: {
          include: { images: { orderBy: { orden: 'asc' }, take: 1 } },
        },
        agent: {
          select: { id: true, name: true, lastName: true, avatarUrl: true },
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
      image: r.property.images[0]?.url || null,
      agent: r.agent,
      promocionado: r.promocionado,
      enCoventa: r.enCoventa,
    }));
  }
}

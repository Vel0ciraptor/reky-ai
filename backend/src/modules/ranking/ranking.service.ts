import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class RankingService {
  constructor(private prisma: PrismaService) { }

  /** Leaderboard — uses same query as /agents/leaderboard, no code duplication */
  async getLeaderboard() {
    const agents = await this.prisma.agent.findMany({
      where: { role: { not: 'admin' } },
      select: {
        id: true,
        name: true,
        lastName: true,
        points: true,
        role: true,
        avatarUrl: true,
        agency: { select: { name: true } },
        _count: {
          select: {
            properties: { where: { enCoventa: false } },
            transactions: true,
          },
        },
      },
      orderBy: { points: 'desc' },
      take: 100,
    });

    return agents.map((a, i) => ({ rank: i + 1, ...a }));
  }

  /** Called by admin.verifyTransaction when a sale is verified */
  async addPoints(agentId: string, pts: number) {
    return this.prisma.agent.update({
      where: { id: agentId },
      data: { points: { increment: pts } },
    });
  }
}

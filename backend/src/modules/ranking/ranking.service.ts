import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class RankingService {
    constructor(private prisma: PrismaService) { }

    async getLeaderboard() {
        const agents = await this.prisma.agent.findMany({
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
                        properties: true,
                        transactions: true,
                    },
                },
            },
            orderBy: { points: 'desc' },
            take: 100,
        });

        return agents.map((a, i) => ({
            rank: i + 1,
            ...a,
        }));
    }

    async addPoints(agentId: string, pts: number) {
        return this.prisma.agent.update({
            where: { id: agentId },
            data: { points: { increment: pts } },
        });
    }
}

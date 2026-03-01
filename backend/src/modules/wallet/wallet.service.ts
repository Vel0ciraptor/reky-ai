import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class WalletService {
    constructor(private prisma: PrismaService) { }

    async getBalance(agentId: string) {
        return this.prisma.wallet.findUnique({ where: { agentId } });
    }

    async deduct(agentId: string, amount: number) {
        const wallet = await this.prisma.wallet.findUnique({ where: { agentId } });
        if (!wallet || Number(wallet.balance) < amount) {
            throw new BadRequestException('Saldo insuficiente. Recarga tu wallet.');
        }
        return this.prisma.wallet.update({
            where: { agentId },
            data: { balance: { decrement: amount } },
        });
    }

    async deposit(agentId: string, amount: number) {
        return this.prisma.wallet.update({
            where: { agentId },
            data: { balance: { increment: amount } },
        });
    }
}

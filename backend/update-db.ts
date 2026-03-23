import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
    console.log('Actualizando cuentas existentes para la demo...');

    // Auto-verificar correos de usuarios existentes
    const users = await prisma.agent.updateMany({
        where: { emailVerified: false },
        data: { emailVerified: true }
    });
    console.log(`✅ ${users.count} usuarios existentes marcados como verificados.`);

    // Dar 365bs a todas las billeteras existentes
    const wallets = await prisma.wallet.updateMany({
        data: { balance: 365 }
    });
    console.log(`✅ ${wallets.count} billeteras actualizadas a 365bs.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

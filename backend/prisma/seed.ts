import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
    console.log('🌱 Checking database and initial data...');

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
        console.log(`🔑 Admin credentials found in environment. Ensuring admin user exists...`);
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const adminUser = await prisma.agent.upsert({
            where: { email: adminEmail },
            update: {},
            create: {
                name: 'Admin',
                lastName: 'System',
                email: adminEmail,
                password: hashedPassword,
                phone: '+591 00000000',
                role: 'admin',
                verified: true,
                emailVerified: true,
            },
        });

        // Ensure the admin has a wallet
        await prisma.wallet.upsert({
            where: { agentId: adminUser.id },
            update: {},
            create: { agentId: adminUser.id, balance: 0 },
        });

        console.log(`✅ Admin user ensured: ${adminEmail}`);
    } else {
        console.log(`⚠️ No ADMIN_EMAIL or ADMIN_PASSWORD found in environment variables.`);
        console.log(`   Skipping main admin creation. The database will be initially empty.`);
    }

    console.log('🚀 Seed complete! Database is ready for production use.');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());

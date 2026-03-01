import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
    console.log('🗓️  Seeding February 2026 transactions...\n');

    // Get all agents (non-admin)
    const agents = await prisma.agent.findMany({
        where: { role: { not: 'admin' } },
        select: { id: true, name: true, lastName: true },
    });
    console.log(`📋 Found ${agents.length} agents`);

    // Get all properties
    const allProperties = await prisma.property.findMany({
        select: { id: true, tipo: true, matricula: true },
    });
    console.log(`🏠 Found ${allProperties.length} properties in DB\n`);

    const ventaProps = allProperties.filter(p => p.tipo === 'venta');
    const alquilerProps = allProperties.filter(p => p.tipo === 'alquiler');
    const anticreticoProps = allProperties.filter(p => p.tipo === 'anticretico');

    console.log(`   Venta: ${ventaProps.length} | Alquiler: ${alquilerProps.length} | Anticrético: ${anticreticoProps.length}\n`);

    // First delete any existing transactions to start fresh
    const deleted = await prisma.transaction.deleteMany({});
    console.log(`🗑️  Deleted ${deleted.count} old transactions\n`);

    // Create transactions for February 2026
    // 40 ventas, 25 alquileres, 5 anticréticos = 70 total
    const transactions: Array<{
        agentId: string;
        propertyId: string;
        tipo: 'venta' | 'alquiler' | 'anticretico';
        fecha: Date;
        verificado: boolean;
    }> = [];

    // Helper: random date in February 2026
    const randomFebDate = () => {
        const day = randInt(1, 28);
        const hour = randInt(8, 20);
        const min = randInt(0, 59);
        return new Date(2026, 1, day, hour, min); // month 1 = February
    };

    // Helper: pick random element
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    // 40 VENTAS
    console.log('📝 Creating 40 ventas...');
    const usedVentaProps = new Set<string>();
    for (let i = 0; i < 40; i++) {
        let prop = pick(ventaProps);
        // Try to avoid duplicates (same property sold twice)
        let attempts = 0;
        while (usedVentaProps.has(prop.id) && attempts < 20) {
            prop = pick(ventaProps);
            attempts++;
        }
        usedVentaProps.add(prop.id);

        const agent = pick(agents);
        // Some already verified by admin, some pending
        const verificado = i < 35; // 35 verified, 5 pending

        transactions.push({
            agentId: agent.id,
            propertyId: prop.id,
            tipo: 'venta',
            fecha: randomFebDate(),
            verificado,
        });
    }

    // 25 ALQUILERES
    console.log('📝 Creating 25 alquileres...');
    const usedAlquilerProps = new Set<string>();
    for (let i = 0; i < 25; i++) {
        let prop = pick(alquilerProps);
        let attempts = 0;
        while (usedAlquilerProps.has(prop.id) && attempts < 20) {
            prop = pick(alquilerProps);
            attempts++;
        }
        usedAlquilerProps.add(prop.id);

        const agent = pick(agents);
        const verificado = i < 22; // 22 verified, 3 pending

        transactions.push({
            agentId: agent.id,
            propertyId: prop.id,
            tipo: 'alquiler',
            fecha: randomFebDate(),
            verificado,
        });
    }

    // 5 ANTICRÉTICOS
    console.log('📝 Creating 5 anticréticos...');
    const usedAntiProps = new Set<string>();
    for (let i = 0; i < 5; i++) {
        let prop = pick(anticreticoProps);
        let attempts = 0;
        while (usedAntiProps.has(prop.id) && attempts < 20) {
            prop = pick(anticreticoProps);
            attempts++;
        }
        usedAntiProps.add(prop.id);

        const agent = pick(agents);
        const verificado = i < 4; // 4 verified, 1 pending

        transactions.push({
            agentId: agent.id,
            propertyId: prop.id,
            tipo: 'anticretico',
            fecha: randomFebDate(),
            verificado,
        });
    }

    // Insert all transactions
    console.log(`\n💾 Inserting ${transactions.length} transactions...`);
    let created = 0;
    for (const tx of transactions) {
        try {
            await prisma.transaction.create({ data: tx });
            created++;
        } catch (e: any) {
            console.warn(`  ⚠️ Skipped: ${e.message?.slice(0, 60)}`);
        }
    }

    // Now update agent points based on their verified transactions
    console.log('\n🏆 Updating agent points based on verified transactions...');
    const pointsMap: Record<string, number> = { venta: 50, alquiler: 20, anticretico: 30 };

    for (const agent of agents) {
        const agentTxs = await prisma.transaction.findMany({
            where: { agentId: agent.id, verificado: true },
            select: { tipo: true },
        });
        const totalPoints = agentTxs.reduce((sum, tx) => sum + (pointsMap[tx.tipo] ?? 10), 0);
        await prisma.agent.update({
            where: { id: agent.id },
            data: { points: totalPoints },
        });
        console.log(`   ${agent.name} ${agent.lastName}: ${agentTxs.length} txs → ${totalPoints} pts`);
    }

    // Summary
    const verifiedCount = transactions.filter(t => t.verificado).length;
    const pendingCount = transactions.filter(t => !t.verificado).length;

    console.log('\n══════════════════════════════════════════');
    console.log('✅ FEBRUARY 2026 SEED COMPLETE');
    console.log('══════════════════════════════════════════');
    console.log(`   Total transactions: ${created}`);
    console.log(`   ├─ Ventas:       40 (35 ✓ / 5 pending)`);
    console.log(`   ├─ Alquileres:   25 (22 ✓ / 3 pending)`);
    console.log(`   └─ Anticréticos:  5 ( 4 ✓ / 1 pending)`);
    console.log(`   Verified: ${verifiedCount} | Pending: ${pendingCount}`);
    console.log('══════════════════════════════════════════\n');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());

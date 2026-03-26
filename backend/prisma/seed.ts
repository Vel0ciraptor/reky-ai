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

    // 🚀 NEW: Sample data for the Matching System
    console.log('🧪 Seeding matching system examples...');

    const c1 = await prisma.captador.create({
        data: {
            nombre: 'Juan Pérez',
            telefono: '+591 70012345',
            zonaTrabajo: 'Equipetrol',
            tipo: 'freelance',
            rating: 4.8,
            activo: true,
        }
    });

    const c2 = await prisma.captador.create({
        data: {
            nombre: 'Agencia Real Estate',
            telefono: '+591 33445566',
            zonaTrabajo: 'Norte',
            tipo: 'agencia',
            rating: 4.5,
            activo: true,
        }
    });

    const r1 = await prisma.requerimiento.create({
        data: {
            titulo: 'Busco Depto 2 Hab en Equipetrol',
            tipoOperacion: 'alquiler',
            tipoPropiedad: 'departamento',
            presupuestoMin: 800,
            presupuestoMax: 1500,
            zona: 'Equipetrol',
            habitaciones: 2,
            descripcion: 'Busco algo moderno cerca de la zona comercial',
            prioridad: 'alta',
            estado: 'activo'
        }
    });

    const r2 = await prisma.requerimiento.create({
        data: {
            titulo: 'Casa Amplia Zona Norte',
            tipoOperacion: 'compra',
            tipoPropiedad: 'casa',
            presupuestoMin: 150000,
            presupuestoMax: 250000,
            zona: 'Norte',
            habitaciones: 3,
            descripcion: 'Casa para familia pequeña con patio',
            prioridad: 'media',
            estado: 'activo'
        }
    });

    // Create matches manually for the seed
    await prisma.match.createMany({
        data: [
            {
                captadorId: c1.id,
                requerimientoId: r1.id,
                scoreMatch: 95,
                estado: 'nuevo',
                notas: 'Match perfecto por zona y presupuesto'
            },
            {
                captadorId: c2.id,
                requerimientoId: r2.id,
                scoreMatch: 85,
                estado: 'nuevo',
                notas: 'Buena opción en el norte'
            },
            {
                captadorId: c1.id,
                requerimientoId: r2.id,
                scoreMatch: 45,
                estado: 'nuevo',
                notas: 'No coincide zona pero presupuesto es similar'
            }
        ]
    });

    console.log('✅ Matching examples seeded successfully!');
    console.log('🚀 Seed complete! Database is ready for production use.');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());

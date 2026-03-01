import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

// Single demo image URL (lovely house photo for all demo properties)
const DEMO_IMAGE = 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80';
const DEMO_IMAGE_2 = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80';
const DEMO_IMAGE_3 = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80';

// Real zones of Santa Cruz de la Sierra with their approximate center coordinates
const ZONES: Array<{
    name: string;
    lat: number;
    lng: number;
    radius: number; // degrees of spread
}> = [
        { name: 'Equipetrol Norte', lat: -17.765, lng: -63.198, radius: 0.008 },
        { name: 'Equipetrol Sur', lat: -17.780, lng: -63.200, radius: 0.007 },
        { name: 'Plan 3000', lat: -17.780, lng: -63.160, radius: 0.012 },
        { name: 'Urubó', lat: -17.720, lng: -63.230, radius: 0.015 },
        { name: 'Centro Histórico', lat: -17.784, lng: -63.181, radius: 0.006 },
        { name: 'Norte', lat: -17.750, lng: -63.181, radius: 0.010 },
        { name: 'Sur', lat: -17.820, lng: -63.181, radius: 0.010 },
        { name: 'Av. Banzer', lat: -17.755, lng: -63.185, radius: 0.008 },
        { name: 'Villa 1ro de Mayo', lat: -17.797, lng: -63.163, radius: 0.009 },
        { name: 'Barrio Lindo', lat: -17.760, lng: -63.195, radius: 0.007 },
        { name: 'Los Lotes', lat: -17.795, lng: -63.200, radius: 0.008 },
        { name: 'Pampa de la Isla', lat: -17.730, lng: -63.200, radius: 0.010 },
        { name: 'Radial 27', lat: -17.807, lng: -63.195, radius: 0.008 },
        { name: 'Cañoto', lat: -17.788, lng: -63.195, radius: 0.005 },
        { name: 'Palermo', lat: -17.772, lng: -63.190, radius: 0.006 },
    ];

const DESCRIPTIONS_VENTA = [
    'Moderno departamento con acabados de primera, luminoso y ventilado, ideal para inversión.',
    'Hermosa casa familiar con amplio jardín, seguridad 24h y excelente ubicación.',
    'Lote de terreno en zona en desarrollo con todos los servicios disponibles.',
    'Casa unifamiliar de dos plantas, totalmente renovada, lista para entrar.',
    'Departamento en planta baja con patio privado, zona tranquila y arbolada.',
    'Casa de estilo moderno, 3 dormitorios en suite, cocina integrada al living.',
    'Propiedad esquinera con potencial comercial en avenida principal.',
    'Duplex con cochera para dos autos, amplios ambientes y buena iluminación.',
    'Casa en condominio cerrado, piscina compartida, seguridad y mantenimiento.',
    'Departamento en edificio nuevo, piso alto con vista panorámica a la ciudad.',
];

const DESCRIPTIONS_ALQUILER = [
    'Departamento amueblado, completamente equipado, listo para entrar.',
    'Habitación independiente con baño privado en casa compartida, zona céntrica.',
    'Local comercial en planta baja con acceso directo desde la calle.',
    'Departamento semi-amueblado, 2 dormitorios, balcón con vista al parque.',
    'Casa amplia para familia, patio trasero grande, estacionamiento techado.',
    'Oficina en piso ejecutivo, recepción compartida, internet incluido.',
    'Casa de veraneo con piscina en zona residencial tranquila.',
    'Studio moderno cerca del centro, ideal para profesionales.',
];

const DESCRIPTIONS_ANTICRETICO = [
    'Departamento en anticrético, 2 dormitorios, zona exclusiva bien ubicada.',
    'Casa en anticrético con jardín y cochera, sector residencial privado.',
    'Departamento anticrético amueblado, acceso a áreas comunes del edificio.',
    'Anticretico en piso 4to, ascensor, portero eléctrico, vista despejada.',
];

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface PropertyData {
    matricula: string;
    descripcion: string;
    ubicacion: string;
    tipo: 'venta' | 'alquiler' | 'anticretico';
    precio: number;
    dormitorios: number;
    banos: number;
    estacionamiento: boolean;
    patio: boolean;
    piscina: boolean;
    tiempoAlquiler?: number;
    tiempoAnticretico?: number;
    lat: number;
    lng: number;
    imageUrl: string;
}

function generateProperties(count: number): PropertyData[] {
    const types: Array<'venta' | 'alquiler' | 'anticretico'> = ['venta', 'alquiler', 'anticretico'];
    const images = [DEMO_IMAGE, DEMO_IMAGE_2, DEMO_IMAGE_3];
    const props: PropertyData[] = [];

    for (let i = 1; i <= count; i++) {
        const zone = pick(ZONES);
        const tipo = pick(types);

        // Precio according to tipo
        let precio: number;
        if (tipo === 'venta') {
            precio = randInt(35000, 350000);
        } else if (tipo === 'alquiler') {
            precio = randInt(300, 2500);
        } else {
            precio = randInt(15000, 80000);
        }

        const dormitorios = randInt(0, 5);
        const banos = Math.max(1, Math.ceil(dormitorios * 0.7));
        const estacionamiento = Math.random() > 0.4;
        const patio = Math.random() > 0.6;
        const piscina = Math.random() > 0.85;

        // Scatter pin within zone radius
        const lat = zone.lat + (Math.random() - 0.5) * zone.radius * 2;
        const lng = zone.lng + (Math.random() - 0.5) * zone.radius * 2;

        let descripcion: string;
        let tiempoAlquiler: number | undefined;
        let tiempoAnticretico: number | undefined;
        if (tipo === 'venta') {
            descripcion = pick(DESCRIPTIONS_VENTA);
            if (dormitorios === 0) descripcion = 'Terreno o local comercial disponible para venta inmediata.';
        } else if (tipo === 'alquiler') {
            descripcion = pick(DESCRIPTIONS_ALQUILER);
            tiempoAlquiler = randInt(6, 24);
        } else {
            descripcion = pick(DESCRIPTIONS_ANTICRETICO);
            tiempoAnticretico = randInt(1, 5);
        }

        props.push({
            matricula: `SCZ-${String(i).padStart(5, '0')}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
            descripcion,
            ubicacion: `${zone.name}, Santa Cruz de la Sierra`,
            tipo,
            precio,
            dormitorios,
            banos,
            estacionamiento,
            patio,
            piscina,
            tiempoAlquiler,
            tiempoAnticretico,
            lat: parseFloat(lat.toFixed(6)),
            lng: parseFloat(lng.toFixed(6)),
            imageUrl: pick(images),
        });
    }

    return props;
}

async function main() {
    console.log('🌱 Seeding Reky AI database...');

    // ── AGENCY ──
    const agency = await prisma.agency.upsert({
        where: { id: 'agency-landmark-001' },
        update: {},
        create: { id: 'agency-landmark-001', name: 'Agencia Landmark SCZ' },
    });
    console.log('✅ Agency created:', agency.name);

    // ── AGENTS ──
    const hashedPassword = await bcrypt.hash('123456', 10);

    const agents = await Promise.all([
        prisma.agent.upsert({
            where: { email: 'juan@rekyai.com' },
            update: {},
            create: {
                name: 'Juan', lastName: 'Pérez', email: 'juan@rekyai.com',
                password: hashedPassword, phone: '+591 70000001',
                role: 'agente', agencyId: agency.id,
            },
        }),
        prisma.agent.upsert({
            where: { email: 'carlos@rekyai.com' },
            update: {},
            create: {
                name: 'Carlos', lastName: 'Vázquez', email: 'carlos@rekyai.com',
                password: hashedPassword, phone: '+591 70000002',
                role: 'agente', points: 1250,
            },
        }),
        prisma.agent.upsert({
            where: { email: 'ana@rekyai.com' },
            update: {},
            create: {
                name: 'Ana', lastName: 'Morales', email: 'ana@rekyai.com',
                password: hashedPassword, phone: '+591 70000003',
                role: 'agente', points: 980,
            },
        }),
        prisma.agent.upsert({
            where: { email: 'pedro@rekyai.com' },
            update: {},
            create: {
                name: 'Pedro', lastName: 'Luna', email: 'pedro@rekyai.com',
                password: hashedPassword, phone: '+591 70000004',
                role: 'agente', agencyId: agency.id, points: 775,
            },
        }),
        prisma.agent.upsert({
            where: { email: 'maria@rekyai.com' },
            update: {},
            create: {
                name: 'María', lastName: 'García', email: 'maria@rekyai.com',
                password: hashedPassword, phone: '+591 70000005',
                role: 'agente', points: 620,
            },
        }),
        prisma.agent.upsert({
            where: { email: 'luis@rekyai.com' },
            update: {},
            create: {
                name: 'Luis', lastName: 'Rodríguez', email: 'luis@rekyai.com',
                password: hashedPassword, phone: '+591 70000006',
                role: 'agente', agencyId: agency.id, points: 510,
            },
        }),
    ]);

    // Create wallets for all agents
    for (const agent of agents) {
        await prisma.wallet.upsert({
            where: { agentId: agent.id },
            update: {},
            create: { agentId: agent.id, balance: randInt(10, 200) },
        });
    }
    console.log(`✅ ${agents.length} agents created with wallets`);

    // ── ADMIN ──
    const adminUser = await prisma.agent.upsert({
        where: { email: 'admin@rekyai.com' },
        update: {},
        create: {
            name: 'Admin', lastName: 'Reky', email: 'admin@rekyai.com',
            password: hashedPassword, phone: '+591 70000000',
            role: 'admin', verified: true, emailVerified: true,
        },
    });
    await prisma.wallet.upsert({
        where: { agentId: adminUser.id },
        update: {},
        create: { agentId: adminUser.id, balance: 0 },
    });
    console.log('✅ Admin user created:', adminUser.email);

    // ── 100 PROPERTIES ──
    const properties = generateProperties(100);
    let created = 0;

    for (const prop of properties) {
        const { imageUrl, ...propertyData } = prop;
        const agentsForProp = [agents[Math.floor(Math.random() * agents.length)]];
        // Sometimes add a second agent (coventa)
        if (Math.random() > 0.75) {
            const second = agents[Math.floor(Math.random() * agents.length)];
            if (second.id !== agentsForProp[0].id) agentsForProp.push(second);
        }

        try {
            const property = await prisma.property.create({
                data: {
                    ...propertyData,
                    precio: propertyData.precio,
                    agents: {
                        create: agentsForProp.map((a, idx) => ({
                            agentId: a.id,
                            promocionado: idx === 0 && Math.random() > 0.7,
                            enCoventa: agentsForProp.length > 1,
                        })),
                    },
                    // @ts-ignore: Prisma client type generation lag
                    images: {
                        create: [
                            { url: imageUrl, orden: 0 },
                        ],
                    },
                },
            });
            created++;
            if (created % 20 === 0) console.log(`  📍 ${created}/100 properties seeded...`);
        } catch (e: any) {
            console.warn(`  ⚠️  Skipping duplicate matricula: ${propertyData.matricula}`);
        }
    }

    console.log(`✅ ${created} properties created in the database`);
    console.log('🚀 Seed complete!');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());

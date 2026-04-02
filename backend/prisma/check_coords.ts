import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function check() {
    try {
        const total = await prisma.property.count();
        const withCoords = await prisma.property.count({ where: { lat: { not: null }, lng: { not: null } } });
        console.log(`Total properties in DB: ${total}`);
        console.log(`Properties with valid coordinates: ${withCoords}`);
        
        // Sample some without coords
        if (total > withCoords) {
            const sample = await prisma.property.findMany({ 
                where: { OR: [{ lat: null }, { lng: null }] },
                take: 5,
                select: { id: true, ubicacion: true, matricula: true }
            });
            console.log('Sample properties WITHOUT coordinates:', JSON.stringify(sample, null, 2));
        }
        
    } catch (e) {
        console.error('Error checking coords:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();

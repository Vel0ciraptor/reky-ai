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
        const commonCoords: any[] = await prisma.$queryRaw`
            SELECT lat, lng, COUNT(*) as cnt 
            FROM "Property" 
            GROUP BY lat, lng 
            HAVING COUNT(*) > 5
            ORDER BY cnt DESC
            LIMIT 10
        `;
        
        console.log('--- REPEATED COORDINATES ---');
        commonCoords.forEach(c => {
           console.log(`Lat: ${c.lat}, Lng: ${c.lng} -> Found ${c.cnt} properties`);
        });

        // Let's see some samples for the highest repeated coord
        if (commonCoords.length > 0) {
            const top = commonCoords[0];
            const samples = await prisma.property.findMany({
                where: { lat: top.lat, lng: top.lng },
                take: 3,
                select: { ubicacion: true, matricula: true }
            });
            console.log(`\nSamples for Lat:${top.lat} Lng:${top.lng}:`, JSON.stringify(samples, null, 2));
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();

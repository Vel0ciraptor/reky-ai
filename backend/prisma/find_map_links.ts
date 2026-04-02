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
        const links = await prisma.property.findMany({ 
            where: { 
                OR: [
                    { descripcion: { contains: 'google.com/maps' } },
                    { descripcion: { contains: 'goo.gl/maps' } },
                    { ubicacion: { contains: 'google.com/maps' } }
                ]
            }, 
            take: 10, 
            select: { descripcion: true, ubicacion: true, id: true } 
        });
        console.log(`Found ${links.length} properties with map links in description.`);
        console.log(JSON.stringify(links, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();

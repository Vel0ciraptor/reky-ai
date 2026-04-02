import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('Iniciando limpieza de la base de datos...');
  
  const agentsToKeep = await prisma.agent.findMany({
    where: {
      OR: [
        { email: { endsWith: '@gmail.com' } },
        { name: { contains: 'Carlos' } },
        { name: { contains: 'Perez' } }
      ]
    }
  });

  const keepIds = agentsToKeep.map(a => a.id);
  console.log(`Se encontraron ${keepIds.length} agentes para mantener (@gmail.com y Carlos Perez).`);

  // 1. Marcar propiedades para eliminar
  // Propiedades demo, o propiedades donde SOLO hay agentes falsos, o vinculadas a un agente que se eliminará
  const propertiesToDelete = await prisma.property.findMany({
    where: {
      OR: [
        { isDemo: true },
        { agents: { some: { agentId: { notIn: keepIds } } } },
        { agents: { none: {} } }
      ]
    },
    select: { id: true }
  });

  const propertyIdsToDelete = propertiesToDelete.map(p => p.id);
  console.log(`Se encontraron ${propertyIdsToDelete.length} propiedades demo/falsas para eliminar.`);

  if (propertyIdsToDelete.length > 0) {
    console.log('Limpiando relaciones de propiedades (PropertyAgent, PropertyTag, ...)...');
    await prisma.propertyAgent.deleteMany({ where: { propertyId: { in: propertyIdsToDelete } } });
    await prisma.propertyTag.deleteMany({ where: { propertyId: { in: propertyIdsToDelete } } });
    await prisma.propertyImage.deleteMany({ where: { propertyId: { in: propertyIdsToDelete } } });
    await prisma.transaction.deleteMany({ where: { propertyId: { in: propertyIdsToDelete } } });
    
    console.log('Eliminando propiedades...');
    await prisma.property.deleteMany({
      where: { id: { in: propertyIdsToDelete } }
    });
  }

  // 2. Eliminar agentes falsos
  const agentsToDelete = await prisma.agent.findMany({
    where: { id: { notIn: keepIds } },
    select: { id: true }
  });
  
  const agentIdsToDelete = agentsToDelete.map(a => a.id);
  console.log(`Se encontraron ${agentIdsToDelete.length} agentes falsos/demo para eliminar.`);

  if (agentIdsToDelete.length > 0) {
    console.log('Limpiando relaciones de agentes (Mensajes, Wallets, Requirements, ...)...');
    await prisma.propertyAgent.deleteMany({ where: { agentId: { in: agentIdsToDelete } } });
    await prisma.message.deleteMany({ where: { OR: [{ senderId: { in: agentIdsToDelete } }, { receiverId: { in: agentIdsToDelete } }] } });
    await prisma.wallet.deleteMany({ where: { agentId: { in: agentIdsToDelete } } });
    await prisma.requirement.deleteMany({ where: { agentId: { in: agentIdsToDelete } } });
    await prisma.transaction.deleteMany({ where: { agentId: { in: agentIdsToDelete } } });
    await prisma.agencyRequest.deleteMany({ where: { agentId: { in: agentIdsToDelete } } });
    await prisma.tag.updateMany({ where: { createdBy: { in: agentIdsToDelete } }, data: { createdBy: null } });
    
    console.log('Eliminando agentes falsos...');
    await prisma.agent.deleteMany({
      where: { id: { in: agentIdsToDelete } }
    });
  }
  
  console.log('¡Limpieza completada exitosamente!');
}

main()
  .catch(e => {
    console.error('Error durante la limpieza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

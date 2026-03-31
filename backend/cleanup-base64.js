const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    console.log('--- Iniciando Limpieza de Imágenes en Base de Datos ---');
    
    // 1. Contar base64
    const images = await prisma.propertyImage.findMany();
    const toDelete = images.filter(img => img.url.startsWith('data:image'));
    
    console.log(`Encontradas ${toDelete.length} imágenes en Base64.`);
    
    if (toDelete.length > 0) {
        // 2. Eliminar de la base de datos
        const deleteRes = await prisma.propertyImage.deleteMany({
            where: {
                id: {
                    in: toDelete.map(img => img.id)
                }
            }
        });
        console.log(`✅ Se eliminaron ${deleteRes.count} registros Base64 de la tabla PropertyImage.`);
    }

    // 3. Verificar si quedan imágenes locales (/uploads)
    const localRes = await prisma.propertyImage.findMany({
        where: {
            url: {
                startsWith: '/uploads'
            }
        }
    });
    console.log(`⚠️ Se detectaron ${localRes.length} imágenes locales (/uploads) que aún no están en R2.`);

    console.log('\n--- Limpieza Finalizada ---');
}

cleanup()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());

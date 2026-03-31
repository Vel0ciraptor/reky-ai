import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkImages() {
    console.log('--- Resumen de Almacenamiento de Imágenes ---');
    const images = await prisma.propertyImage.findMany();
    
    let base64Count = 0;
    let r2Count = 0;
    let localCount = 0;
    
    for (const img of images) {
        if (img.url.startsWith('data:image')) {
            base64Count++;
            console.log(`⚠️ Imagen ID ${img.id} es Base64 (Longitud: ${img.url.length} chars)`);
        } else if (img.url.includes('r2.dev')) {
            r2Count++;
        } else if (img.url.startsWith('/uploads')) {
            localCount++;
        }
    }
    
    console.log('\n--- Totales ---');
    console.log(`Base64: ${base64Count}`);
    console.log(`R2: ${r2Count}`);
    console.log(`Local: ${localCount}`);
    
    if (base64Count > 0) {
        console.log('\n❌ ERROR: Se detectaron imágenes en Base64 en la base de datos.');
    } else {
        console.log('\n✅ ÉXITO: No hay imágenes en Base64 en la base de datos.');
    }
}

checkImages()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());

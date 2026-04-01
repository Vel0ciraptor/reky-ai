import { PrismaClient, PropertyType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import * as readline from 'readline';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);
const SQL_FILE_PATH = 'e:\\Oscar Zabala\\Downloads\\remax_bd_completa.sql';
const LIMIT = 5; // PONER EN 0 PARA PROCESAR TODOS
const DELAY_MS = 1000; // Espera 1 segundo entre peticiones para evitar bloqueos

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mapea el texto a los Enum válidos de tu BD (venta, alquiler, anticretico)
function mapPropertyType(typeStr: string): PropertyType {
  const lower = typeStr.toLowerCase();
  if (lower.includes('alquiler') || lower.includes('rent')) return PropertyType.alquiler;
  if (lower.includes('anticretico')) return PropertyType.anticretico;
  return PropertyType.venta; // Por defecto
}

// Función que extrae la data json de cada link url de Remax
async function fetchPropertyData(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });
    const html = await res.text();
    const dataPageMatch = html.match(/data-page="([^"]+)"/);
    if (!dataPageMatch) return null;
    
    // Convertir &quot; de nuevo a comillas dobles y escapar
    const decodedHtml = dataPageMatch[1].replace(/&quot;/g, '"');
    return JSON.parse(decodedHtml);
  } catch (error: any) {
    console.error(`Error visitando ${url}:`, error.message);
    return null;
  }
}

async function runTest() {
  console.log('Extraiendo URLs del archivo SQL...');
  const urls = new Set<string>();

  // Lee el SQL y busca las urls con Regex
  const rl = readline.createInterface({
    input: fs.createReadStream(SQL_FILE_PATH),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const match = line.match(/(https:\/\/remax\.bo\/propiedad\/[^\s'"]+)/);
    if (match) {
      urls.add(match[match.length - 1]);
      if (LIMIT > 0 && urls.size >= LIMIT) {
          break; 
      }
    }
  }

  const urlArray = Array.from(urls);
  console.log(`Se encontraron ${urlArray.length} URLs. Iniciando magia...`);

  for (const url of urlArray) {
    console.log(`\n---------------------------------`);
    console.log(`🔗 Scrapeando URL: ${url}`);
    
    const data = await fetchPropertyData(url);
    if (!data || !data.props || !data.props.listing) {
        console.log(`[SALTANDO] No se pudo extraer información estructurada (Página tal vez inactiva).`);
        continue;
    }

    const props = data.props;
    const listing = props.listing;

    // ----- 1. PREPARACIÓN Y CREACIÓN DEL AGENTE -----
    const rawAgent = listing.agent || (listing.agents && listing.agents.length > 0 ? listing.agents[0] : null) || props.agent || (props.agents && props.agents.length > 0 ? props.agents[0] : null);
    if (!rawAgent || !rawAgent.user) {
        console.log(`[SALTANDO] No hay información del agente para este inmueble.`);
        continue;
    }

    const user = rawAgent.user;
    const email = user.email || `${user.phone_number}@remax.bo.temp`; // Asegurar que sea único
    let agent = await prisma.agent.findUnique({ where: { email } });
    
    if (!agent) {
       agent = await prisma.agent.create({
           data: {
               name: user.first_name || 'Agente',
               lastName: user.last_name || 'Remax',
               email: email,
               password: '$2b$10$abcdefghijklmnopqrstuv', // Clave encriptada dummy
               phone: user.phone_number || '',
               avatarUrl: rawAgent.image_url,
               role: 'agente',
               verified: true, // Auto verificar al agente
               emailVerified: true
           }
       });
       console.log(`🧑‍💼 Agente Nuevo: ${agent.name} ${agent.lastName} Creado existosamente.`);
    } else {
       console.log(`🧑‍💼 Agente Ya Existe: ${agent.name} ${agent.lastName}`);
    }

    // ----- 2. PREPARACIÓN Y CREACIÓN DE PROPIEDAD -----
    const ubicacionInfo = listing.location || {};
    let ubicacionStr = 'Santa Cruz';
    if (ubicacionInfo.zone && ubicacionInfo.city) {
        ubicacionStr = `${ubicacionInfo.zone.name}, ${ubicacionInfo.city.name}`;
    } else if (ubicacionInfo.zone) {
        ubicacionStr = ubicacionInfo.zone.name;
    }

    // Precio en USD normalmente
    let price = 0;
    if (listing.prices?.price_in_dollars) price = listing.prices.price_in_dollars;
    else if (listing.prices?.amount) price = listing.prices.amount; // default fallback

    const tType = listing.transaction_type?.name || listing.title || '';
    const info = listing.listing_information || {};

    const fullDesc = `**${listing.title || 'Inmueble'}**\n\n${listing.description_website || 'Sin descripción detallada.'}`;

    const property = await prisma.property.create({
        data: {
            descripcion: fullDesc, // Insertamos el titulo y desc combinado ya que no hay 'titulo' individual en la base bd
            ubicacion: ubicacionStr,
            tipo: mapPropertyType(tType),
            precio: price,
            dormitorios: info.number_bedrooms || 0,
            banos: info.number_bathrooms || 0,
            tipoVivienda: info.subtype_property?.name || 'Inmueble',
            lat: parseFloat(ubicacionInfo.latitude) || null,
            lng: parseFloat(ubicacionInfo.longitude) || null,
            isDemo: false,
        }
    });

    // ----- 3. GUARDADO DE IMÁGENES -----
    const multimedias = listing.multimedias || [];
    let numFotos = 0;
    for (let i = 0; i < multimedias.length; i++) {
        if (multimedias[i].link) {
            await prisma.propertyImage.create({
                data: {
                    propertyId: property.id,
                    url: multimedias[i].link,
                    orden: i
                }
            });
            numFotos++;
        }
    }

    // ----- 4. ENLACE ENTRE AGENTE Y PROPIEDAD -----
    await prisma.propertyAgent.create({
        data: {
            propertyId: property.id,
            agentId: agent.id,
            enCoventa: false,
            promocionado: false 
        }
    });
    
    console.log(`🏡 Propiedad Creada: ${ubicacionStr} ($${price})`);
    console.log(`📸 Fotos guardadas: ${numFotos}`);
    
    await sleep(DELAY_MS);
  }

  console.log(`\n✅ MIGRACIÓN FINALIZADA (${urlArray.length} completados).`);
}

runTest().catch(console.error).finally(() => prisma.$disconnect());

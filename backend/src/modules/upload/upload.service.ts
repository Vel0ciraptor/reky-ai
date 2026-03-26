import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type sharp_t from 'sharp';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp: typeof sharp_t = require('sharp');
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
    private supabase: SupabaseClient;
    private readonly bucketName = 'properties';

    constructor(private configService: ConfigService) {
        const url = this.configService.get<string>('SUPABASE_URL');
        const key = this.configService.get<string>('SUPABASE_KEY');

        if (!url || !key) {
            console.error('Error: Supabase credentials (SUPABASE_URL / SUPABASE_KEY) are missing in environment variables. Image uploads will not work.');
            return;
        }

        try {
            this.supabase = createClient(url, key);
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
        }
    }

    async processAndSave(file: Express.Multer.File): Promise<string> {
        if (!this.supabase) {
            throw new InternalServerErrorException('El servicio de subida no está configurado (URL de Supabase faltante)');
        }
        const filename = `${randomUUID()}.webp`;

        try {
            // 1. Optimize image with Sharp (WebP, scale down, format)
            const webpBuffer = await sharp(file.buffer)
                .resize({ width: 1200, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            // 2. Upload to Supabase Storage
            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .upload(filename, webpBuffer, {
                    contentType: 'image/webp',
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Supabase Upload Error:', error);
                throw new InternalServerErrorException('Error al subir imagen a Supabase');
            }

            // 3. Return the Public URL
            const { data: { publicUrl } } = this.supabase.storage
                .from(this.bucketName)
                .getPublicUrl(data.path);

            return publicUrl;
        } catch (error) {
            console.error('Process Error:', error);
            throw new InternalServerErrorException('Error procesando la imagen');
        }
    }
}

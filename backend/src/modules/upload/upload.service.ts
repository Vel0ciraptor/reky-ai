import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type sharp_t from 'sharp';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp: typeof sharp_t = require('sharp');

@Injectable()
export class UploadService {
    constructor(private configService: ConfigService) {
        cloudinary.config({
            cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
        });
    }

    async processAndSave(file: Express.Multer.File): Promise<string> {
        try {
            // 1. Optimize image locally with Sharp (Convert to WebP, resize)
            const webpBuffer = await sharp(file.buffer)
                .resize({ width: 1200, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            // 2. Upload to Cloudinary using upload_stream
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'reky-ai/properties',
                        format: 'webp',
                        resource_type: 'image'
                    },
                    (error, result) => {
                        if (error || !result) {
                            console.error('Cloudinary Upload Error:', error);
                            return reject(new InternalServerErrorException('Error al subir imagen a Cloudinary'));
                        }
                        resolve(result.secure_url);
                    }
                );

                uploadStream.end(webpBuffer);
            });

        } catch (error) {
            console.error('Process Error:', error);
            throw new InternalServerErrorException('Error procesando la imagen');
        }
    }
}

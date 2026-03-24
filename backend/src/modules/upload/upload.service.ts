import { Injectable } from '@nestjs/common';
import type sharp_t from 'sharp';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp: typeof sharp_t = require('sharp');
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
    private readonly uploadDir = path.join(process.cwd(), 'uploads', 'properties');

    constructor() {
        // Ensure folder exists at startup
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async processAndSave(file: Express.Multer.File): Promise<string> {
        const filename = `${randomUUID()}.webp`;
        const outputPath = path.join(this.uploadDir, filename);

        // Convert JPG → WebP, resize to max 1200px wide, quality 75
        await sharp(file.buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .webp({ quality: 75 })
            .toFile(outputPath);

        // Return a public URL path (served as static files from /uploads/properties/)
        return `/uploads/properties/${filename}`;
    }
}

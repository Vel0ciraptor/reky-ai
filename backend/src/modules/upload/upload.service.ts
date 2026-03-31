import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class UploadService {
    private s3Client: S3Client;
    private bucketName: string;
    private publicUrl: string;

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService
    ) {
        const accountId = this.configService.get<string>('R2_ACCOUNT_ID') || '';
        const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID') || '';
        const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY') || '';
        this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || '';
        this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';

        this.s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }

    async getPresignedUrl(userId: string, entityId: string, fileName: string) {
        if (!this.bucketName) {
            console.error('CRITICAL: R2_BUCKET_NAME is not defined in environment variables.');
            throw new InternalServerErrorException('Error de configuración del servidor (Bucket)');
        }

        // Validation: properties/user_id/entity_id/uuid.webp
        const extension = 'webp';
        const uniqueName = `properties/${userId}/${entityId}/${uuidv4()}.${extension}`;

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: uniqueName,
            ContentType: 'image/webp',
        });

        try {
            const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
            const fileUrl = `${this.publicUrl}/${uniqueName}`;
            return { uploadUrl, fileUrl };
        } catch (error: any) {
            console.error('Error generating presigned URL for R2:', {
                message: error.message,
                bucket: this.bucketName,
                key: uniqueName
            });
            throw new InternalServerErrorException('Error al generar URL de subida a Cloudflare');
        }
    }

    async saveImageMetadata(userId: string, entityId: string, url: string) {
        try {
            return await this.prisma.propertyImage.create({
                data: {
                    propertyId: entityId,
                    url: url,
                    orden: 0
                }
            });
        } catch (error: any) {
            console.error('Error saving image metadata to Supabase:', error.message);
            // We allow this to fail if it's a new property, as the final POST will link them.
            return { warning: 'Metadata could not be saved yet', error: error.message };
        }
    }
}

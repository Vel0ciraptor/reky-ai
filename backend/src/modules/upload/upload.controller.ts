import {
    Controller,
    Post,
    Body,
    Req,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post('upload-url')
    async getUploadUrl(@Req() req: any, @Body() body: { entityId: string; type: string }) {
        if (!body.entityId || !body.type) {
            throw new BadRequestException('entityId and type are required');
        }

        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimes.includes(body.type)) {
            throw new BadRequestException('Solo se permiten imágenes (jpg, png, webp)');
        }

        const userId = req.user.sub;
        return this.uploadService.getPresignedUrl(userId, body.entityId, body.type);
    }

    @Post('images')
    async saveMetadata(@Req() req: any, @Body() body: { entityId: string; url: string }) {
        if (!body.entityId || !body.url) {
            throw new BadRequestException('entityId and url are required');
        }

        const userId = req.user.sub;
        return this.uploadService.saveImageMetadata(userId, body.entityId, body.url);
    }
}

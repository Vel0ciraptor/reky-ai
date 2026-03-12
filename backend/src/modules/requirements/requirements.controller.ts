import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import type { Request } from 'express';

@Controller('requirements')
@UseGuards(JwtAuthGuard)
export class RequirementsController {
    constructor(private readonly requirementsService: RequirementsService) { }

    @Post()
    create(@Req() req: Request, @Body() createRequirementDto: CreateRequirementDto) {
        return this.requirementsService.create((req.user as any).agentId, createRequirementDto);
    }

    @Get()
    findAll() {
        return this.requirementsService.findAll();
    }

    @Get('me')
    findByAgent(@Req() req: Request) {
        return this.requirementsService.findByAgent((req.user as any).agentId);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Req() req: Request) {
        return this.requirementsService.remove(id, (req.user as any).agentId);
    }
}

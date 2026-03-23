import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import type { Request } from 'express';

@Controller('requirements')
@UseGuards(JwtAuthGuard)
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  create(
    @Req() req: Request,
    @Body() createRequirementDto: CreateRequirementDto,
  ) {
    const agentId = (req.user as any).sub || (req.user as any).id;
    return this.requirementsService.create(
      agentId,
      createRequirementDto,
    );
  }

  @Get()
  findAll() {
    return this.requirementsService.findAll();
  }

  @Get('me')
  findByAgent(@Req() req: Request) {
    const agentId = (req.user as any).sub || (req.user as any).id;
    return this.requirementsService.findByAgent(agentId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const agentId = (req.user as any).sub || (req.user as any).id;
    return this.requirementsService.remove(id, agentId);
  }
}

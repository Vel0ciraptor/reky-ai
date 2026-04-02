import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createPropertyDto: CreatePropertyDto, @Request() req: any) {
    console.log('req.user:', req.user);
    const agentId = req.user?.sub || req.user?.id;
    if (!agentId) throw new Error('Agent ID missing from token');
    return this.propertiesService.create(createPropertyDto, agentId);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = parseInt(page || '0');
    const l = parseInt(limit || '0');
    return this.propertiesService.findAll(p, l);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      precio?: number;
      alquilado?: boolean;
      tiempoAlquiler?: number | null;
      tiempoAnticretico?: number | null;
    },
  ) {
    return this.propertiesService.updateProperty(id, body);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req: any) {
    const agentId = req.user?.sub || req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    return this.propertiesService.deleteProperty(id, agentId, isAdmin);
  }
}

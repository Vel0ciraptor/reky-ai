import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
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
  findAll() {
    return this.propertiesService.findAll();
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
}

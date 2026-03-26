import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { MatchingService } from './matching.service';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post('captadores')
  async createCaptador(@Body() body: { nombre: string; telefono: string; zonaTrabajo: string; tipo: string }) {
    return this.matchingService.createCaptador(body);
  }

  @Post('requerimientos')
  async createRequerimiento(@Body() body: any) {
    return this.matchingService.createRequerimiento(body);
  }

  @Get('requerimientos')
  async findAll() {
      return this.matchingService.findAllRequirements();
  }

  @Get('requerimientos/me')
  async findMine() {
      // In a real app we'd get the current user ID
      return this.matchingService.findAllRequirements();
  }

  @Get('requerimientos/:id/matches')
  async getMatches(@Param('id') id: string) {
    return this.matchingService.getMatchesForRequirement(id);
  }

  @Patch('matches/:id/status')
  async updateStatus(@Param('id') id: string, @Body('estado') estado: string) {
    return this.matchingService.updateMatchStatus(id, estado);
  }
}

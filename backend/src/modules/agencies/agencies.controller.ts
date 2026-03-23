import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('agencies')
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  // Public: list all agencies (for registration dropdown)
  @Get()
  listAll() {
    return this.agenciesService.listAll();
  }

  // Protected: agency dashboard
  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  getDashboard(@Request() req: any) {
    return this.agenciesService.getDashboard(req.user.sub);
  }

  // Protected: agent requests to join agency
  @UseGuards(JwtAuthGuard)
  @Post('request-join')
  requestToJoin(@Request() req: any, @Body() body: { agencyId: string }) {
    return this.agenciesService.requestToJoin(req.user.sub, body.agencyId);
  }

  // Protected: agency accepts a pending request
  @UseGuards(JwtAuthGuard)
  @Patch('requests/:id/accept')
  acceptRequest(@Request() req: any, @Param('id') requestId: string) {
    return this.agenciesService.acceptRequest(req.user.sub, requestId);
  }

  // Protected: agency rejects a pending request
  @UseGuards(JwtAuthGuard)
  @Patch('requests/:id/reject')
  rejectRequest(@Request() req: any, @Param('id') requestId: string) {
    return this.agenciesService.rejectRequest(req.user.sub, requestId);
  }

  // Protected: agency invites an independent agent by email
  @UseGuards(JwtAuthGuard)
  @Post('invite')
  inviteAgent(@Request() req: any, @Body() body: { email: string }) {
    return this.agenciesService.inviteAgent(req.user.sub, body.email);
  }

  // Protected: search independent agents (for invite autocomplete)
  @UseGuards(JwtAuthGuard)
  @Get('search-agents')
  searchIndependentAgents(@Query('q') q: string) {
    return this.agenciesService.searchIndependentAgents(q);
  }

  // Protected: agent accepts invitation from agency
  @UseGuards(JwtAuthGuard)
  @Patch('invitations/:id/accept')
  acceptInvitation(@Request() req: any, @Param('id') requestId: string) {
    return this.agenciesService.acceptInvitation(req.user.sub, requestId);
  }

  // Protected: agent rejects invitation
  @UseGuards(JwtAuthGuard)
  @Patch('invitations/:id/reject')
  rejectInvitation(@Request() req: any, @Param('id') requestId: string) {
    return this.agenciesService.rejectInvitation(req.user.sub, requestId);
  }

  // Protected: get my pending invitations (for agent profile)
  @UseGuards(JwtAuthGuard)
  @Get('my-invitations')
  getMyInvitations(@Request() req: any) {
    return this.agenciesService.getMyInvitations(req.user.sub);
  }

  // Protected: remove agent from agency
  @UseGuards(JwtAuthGuard)
  @Delete('agents/:id')
  removeAgent(@Request() req: any, @Param('id') agentId: string) {
    return this.agenciesService.removeAgent(req.user.sub, agentId);
  }

  // Protected: get all agency properties
  @UseGuards(JwtAuthGuard)
  @Get('properties')
  getAgencyProperties(@Request() req: any) {
    return this.agenciesService.getAgencyProperties(req.user.sub);
  }
}

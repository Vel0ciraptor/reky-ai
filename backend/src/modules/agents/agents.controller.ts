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
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) { }

  @Get()
  findAll() {
    return this.agentsService.findAll();
  }

  @Get('leaderboard')
  leaderboard() {
    return this.agentsService.getLeaderboard();
  }

  @Post('upload-avatar')
  uploadAvatar(@Request() req: any, @Body() body: { avatarUrl: string }) {
    return this.agentsService.uploadAvatar(req.user.sub, body.avatarUrl);
  }

  @Post('upload-identity')
  uploadIdentity(
    @Request() req: any,
    @Body() body: { frontUrl: string; backUrl: string },
  ) {
    return this.agentsService.uploadIdentity(
      req.user.sub,
      body.frontUrl,
      body.backUrl,
    );
  }

  @Post('send-verification-email')
  sendVerificationEmail(@Request() req: any) {
    return this.agentsService.sendVerificationEmail(req.user.sub);
  }

  @Post('verify-email')
  verifyEmailCode(@Request() req: any, @Body() body: { code: string }) {
    return this.agentsService.verifyEmailCode(req.user.sub, body.code);
  }

  @Get('my-properties')
  myProperties(@Request() req: any) {
    return this.agentsService.getMyProperties(req.user.sub);
  }

  @Patch('update-profile')
  updateProfile(
    @Request() req: any,
    @Body() body: { name?: string; lastName?: string; phone?: string },
  ) {
    return this.agentsService.updateProfile(req.user.sub, body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }
}

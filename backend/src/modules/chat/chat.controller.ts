import { Controller, Get, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Get('conversations')
  getConversations(@Request() req: any) {
    return this.chatService.getConversations(req.user.sub);
  }

  @Get('conversation/:partnerId')
  getConversation(@Request() req: any, @Param('partnerId') partnerId: string) {
    return this.chatService.getConversation(req.user.sub, partnerId);
  }

  @Delete('conversation/:partnerId')
  deleteConversation(@Request() req: any, @Param('partnerId') partnerId: string) {
    return this.chatService.deleteConversation(req.user.sub, partnerId);
  }
}

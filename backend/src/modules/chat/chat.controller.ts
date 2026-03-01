import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get('conversations')
    getConversations(@Request() req: any) {
        return this.chatService.getConversations(req.user.id);
    }

    @Get('conversation/:partnerId')
    getConversation(@Request() req: any, @Param('partnerId') partnerId: string) {
        return this.chatService.getConversation(req.user.id, partnerId);
    }
}

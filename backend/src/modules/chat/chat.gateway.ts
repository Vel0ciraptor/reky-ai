import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<string, string>(); // agentId -> socketId

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // Remove from online users
    for (const [agentId, socketId] of this.onlineUsers.entries()) {
      if (socketId === client.id) {
        this.onlineUsers.delete(agentId);
        this.server.emit('user_offline', { agentId });
        break;
      }
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { agentId: string },
  ) {
    this.onlineUsers.set(data.agentId, client.id);
    this.server.emit('user_online', { agentId: data.agentId });
    // Send current online users list to newly connected client
    client.emit('online_users', Array.from(this.onlineUsers.keys()));
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    client.join(data.roomId);
    client.emit('joined', { roomId: data.roomId });
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      senderId: string;
      receiverId: string;
      content: string;
      roomId: string;
    },
  ) {
    const result = await this.chatService.sendMessage(data);
    if (result.error) {
      client.emit('chat_error', { message: result.error });
      return;
    }

    // Broadcast to room (both sender and receiver see it)
    this.server.to(data.roomId).emit('new_message', result.message);

    // Also emit to receiver's personal socket if not in the room
    const receiverSocketId = this.onlineUsers.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('new_conversation_message', {
        ...result.message,
        roomId: data.roomId,
      });
    }

    // Emit to sender's own socket to trigger conversation list refresh
    client.emit('new_conversation_message');
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { roomId: string; agentId: string; typing: boolean },
  ) {
    _client.to(data.roomId).emit('typing_indicator', {
      agentId: data.agentId,
      typing: data.typing,
    });
  }
}

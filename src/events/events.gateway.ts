import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const rawToken =
        client.handshake.query.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!rawToken) {
        this.logger.warn(`Client disconnected (no token): ${client.id}`);
        client.disconnect();
        return;
      }

      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { tokenVersion: true, isVerified: true },
      });

      if (
        !user ||
        !user.isVerified ||
        (payload.tv ?? 0) !== user.tokenVersion
      ) {
        this.logger.warn(`Client disconnected (invalid session): ${client.id}`);
        client.disconnect();
        return;
      }

      client.data.user = payload;
      client.join(`user_${payload.sub}`);

      if (payload.role === 'VENDOR') {
        client.join(`vendor_${payload.sub}`);
      }

      this.logger.log(
        `Client terhubung: [ID: ${client.id}] | User ID: ${payload.sub} | Role: ${payload.role}`,
      );
    } catch (error) {
      this.logger.error(`Koneksi WebSocket ditolak (invalid JWT): ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client terputus: ${client.id}`);
  }

  notifyCustomerOrderUpdate(
    customerId: number,
    orderId: number,
    status: string,
    message?: string,
  ) {
    this.server.to(`user_${customerId}`).emit('orderUpdate', {
      orderId,
      status,
      message: message || `Status order #${orderId} berubah jadi ${status}`,
    });
  }

  notifyVendorNewOrder(vendorUserId: number, orderId: number, total: number) {
    this.server.to(`vendor_${vendorUserId}`).emit('newOrder', {
      orderId,
      message: `Ada pesanan baru masuk! (Total: Rp ${total})`,
    });
  }
}

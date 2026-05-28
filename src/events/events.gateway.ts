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

  constructor(private jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      // Ambil token dari query string (biasanya frontend kirim ?token=xxx) atau header Authorization
      const rawToken = client.handshake.query.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!rawToken) {
        this.logger.warn(`Client disconnected (no token): ${client.id}`);
        client.disconnect();
        return;
      }

      // Verifikasi token (sama seperti verifyAuth)
      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
      const payload = await this.jwtService.verifyAsync(token); // akan throw error kalau invalid

      // Simpan user info di objek client
      client.data.user = payload;
      
      // Join ke "ruang" (room) berdasarkan ID mereka (misal: 'user_12', 'vendor_4')
      client.join(`user_${payload.sub}`);
      
      if (payload.role === 'VENDOR') {
        client.join(`vendor_${payload.sub}`); // Bisa nembak event khusus vendor
      }

      this.logger.log(`Client terhubung: [ID: ${client.id}] | User ID: ${payload.sub} | Role: ${payload.role}`);
    } catch (error) {
      this.logger.error(`Koneksi WebSocket ditolak (invalid JWT): ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client terputus: ${client.id}`);
  }

  // --- METHODS UNTUK DI PANGGIL DARI SERVICE (Order, Payment, dsb) ---

  // Notifikasi Customer saat order statusnya berubah (misal dari ACCEPTED -> READY)
  notifyCustomerOrderUpdate(customerId: number, orderId: number, status: string, message?: string) {
    this.server.to(`user_${customerId}`).emit('orderUpdate', {
      orderId,
      status,
      message: message || `Status order #${orderId} berubah jadi ${status}`,
    });
  }

  // Notifikasi Vendor saat ada pesanan baru sukses di Checkout (atau berhasil dibayar QRIS)
  notifyVendorNewOrder(vendorUserId: number, orderId: number, total: number) {
    this.server.to(`vendor_${vendorUserId}`).emit('newOrder', {
      orderId,
      message: `Ada pesanan baru masuk! (Total: Rp ${total})`,
    });
  }
}
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  // Payload yang ada di dalam JWT token
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        tokenVersion: true,
        vendorProfile: { select: { id: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Token tidak valid');
    if (!user.isVerified) throw new UnauthorizedException('Akun belum diverifikasi');

    const tokenVersion = payload.tv ?? 0;
    if (tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('Sesi telah berakhir. Silakan login kembali');
    }

    return user;
  }
}
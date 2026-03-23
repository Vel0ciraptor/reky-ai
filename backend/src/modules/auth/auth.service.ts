import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infra/database/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { Resend } from 'resend';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private resend: Resend;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.agent.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Este correo ya está registrado.');

    const hashed = await bcrypt.hash(dto.password, 12);
    const code = crypto.randomBytes(32).toString('hex');

    const agent = await this.prisma.agent.create({
      data: {
        name: dto.name,
        lastName: dto.lastName,
        email: dto.email,
        password: hashed,
        phone: dto.phone,
        role: dto.role ?? 'agente',
        emailVerified: false,
        verificationCode: code,
      },
    });

    // Create wallet for new agent
    await this.prisma.wallet.create({
      data: { agentId: agent.id, balance: 0 },
    });

    if (dto.agencyId && dto.role !== 'agencia') {
      const agency = await this.prisma.agency.findUnique({
        where: { id: dto.agencyId },
      });
      if (agency) {
        await this.prisma.agencyRequest.create({
          data: {
            agentId: agent.id,
            agencyId: dto.agencyId,
            type: 'request',
            status: 'pending',
          },
        });
      }
    }

    // Send verification email
    await this.sendVerificationEmail(agent.email, agent.name, code);

    return { message: 'Registro exitoso. Por favor revisa tu correo electrónico para activar tu cuenta.' };
  }

  async resendVerification(email: string) {
    if (!email) throw new BadRequestException('El correo es obligatorio');

    const agent = await this.prisma.agent.findUnique({ where: { email } });
    if (!agent) throw new BadRequestException('El usuario no existe o el correo es incorrecto.');
    if (agent.emailVerified) throw new BadRequestException('La cuenta ya está verificada.');

    const code = agent.verificationCode || crypto.randomBytes(32).toString('hex');

    // If it didn't have a code for some reason, generate and save a new one
    if (!agent.verificationCode) {
      await this.prisma.agent.update({
        where: { id: agent.id },
        data: { verificationCode: code },
      });
    }

    await this.sendVerificationEmail(agent.email, agent.name, code);

    return { message: 'Correo reenviado exitosamente. Por favor revisa tu correo.' };
  }

  private async sendVerificationEmail(email: string, name: string, code: string) {
    if (!this.resend) {
      console.warn('⚠️ RESEND_API_KEY no configurada. Saltando envío de correo.');
      return;
    }

    const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173/#'}/verify-email?token=${code}`;
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Reky AI <onboarding@resend.dev>',
        to: email,
        subject: 'Activa tu cuenta en Reky AI',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; text-align: center; border-radius: 12px; border: 1px solid #eee; background-color: #FAFAFA;">
              <h2 style="color: #FF5A1F;">¡Bienvenido a Reky AI!</h2>
              <p style="color: #555; font-size: 16px;">Hola <strong>${name}</strong>, para iniciar sesión y usar la plataforma, por favor activa tu cuenta haciendo clic en el botón de abajo:</p>
              <br/>
              <a href="${verifyLink}" style="background-color: #FF5A1F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Activar Mi Cuenta</a>
              <br/><br/>
              <p style="color: #999; font-size: 12px;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>${verifyLink}</p>
          </div>
        `,
      });

      if (error) {
        console.error('❌ Error de Resend:', error);
      } else {
        console.log(`✅ Correo enviado con éxito a ${email}. ID:`, data?.id);
      }
    } catch (err) {
      console.error('No se pudo enviar el correo:', err);
    }
  }

  async verifyEmail(token: string) {
    if (!token) throw new BadRequestException('Token inválido o faltante.');

    const agent = await this.prisma.agent.findFirst({
      where: { verificationCode: token }
    });

    if (!agent) throw new BadRequestException('El enlace de verificación es inválido o ya ha expirado.');

    await this.prisma.agent.update({
      where: { id: agent.id },
      data: { emailVerified: true, verificationCode: null },
    });

    return { message: 'Cuenta activada exitosamente' };
  }

  async login(dto: LoginDto) {
    const agent = await this.prisma.agent.findUnique({
      where: { email: dto.email },
    });
    if (!agent) throw new UnauthorizedException('Credenciales inválidas.');

    const valid = await bcrypt.compare(dto.password, agent.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas.');

    if (!agent.emailVerified) {
      throw new UnauthorizedException('Tu cuenta aún no está verificada. Por favor, revisa tu correo para activarla.');
    }

    const token = this.signToken(agent.id, agent.email, agent.role);
    return { agent: this.sanitize(agent), token };
  }

  async me(agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        wallet: true,
        agency: true,
        _count: { select: { properties: true, transactions: true } },
      },
    });
    if (!agent) throw new UnauthorizedException();
    return this.sanitize(agent);
  }

  private signToken(id: string, email: string, role: string) {
    return this.jwt.sign({ sub: id, email, role });
  }

  private sanitize(agent: any) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, verificationCode, ...rest } = agent;
    return rest;
  }
}

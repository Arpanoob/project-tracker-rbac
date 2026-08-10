import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { CookieOptions, Response } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.authService.validateAndSign(dto);

    res.cookie('access_token', token, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24,
    });

    return { user };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', cookieOptions);
    return { message: 'Logged out' };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { user };
  }
}

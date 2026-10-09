import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { validationError, unauthorized } from '../services/errors';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { password } = req.body;
      if (!password) {
        throw validationError('Password is required');
      }

      const token = await AuthService.login(password);
      if (!token) {
        throw unauthorized('Invalid credentials');
      }

      const isProduction = process.env.NODE_ENV === 'production';

      // Set HTTP-only cookie with sameSite: 'none' for cross-domain support (Vercel <-> Render)
      res.cookie('sudo_token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.status(200).json({ success: true, token, message: 'Logged in successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      res.clearCookie('sudo_token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
      });
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async status(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.sudo_token || (req.headers['x-sudo-token'] as string) || (req.headers['authorization']?.replace('Bearer ', ''));
      if (!token) {
        return res.status(200).json({ isAdmin: false });
      }

      const payload = AuthService.verifyToken(token);
      if (!payload || payload.role !== 'ADMIN') {
        return res.status(200).json({ isAdmin: false });
      }

      return res.status(200).json({ isAdmin: true, username: payload.username });
    } catch (error) {
      next(error);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.sudo_token || (req.headers['x-sudo-token'] as string) || (req.headers['authorization']?.replace('Bearer ', ''));

  if (!token) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized: Missing SUDO token' } });
    return;
  }

  const payload = AuthService.verifyToken(token);
  if (!payload || payload.role !== 'ADMIN') {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized: Invalid or expired SUDO token' } });
    return;
  }

  // Attach user payload to request
  (req as any).user = payload;
  next();
};

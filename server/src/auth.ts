import bcrypt from 'bcryptjs';
import { and, eq, gt } from 'drizzle-orm';
import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import type { Db } from './db/client';
import { refreshTokens } from './db/schema';
import { HttpError } from './http';

const ACCESS_TTL_SEC = 15 * 60;
const REFRESH_TTL_DAYS = 60;

export interface AuthedRequest extends Request {
  userId: string;
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function issueTokens(db: Db, secret: string, userId: string): Promise<Tokens> {
  const accessToken = jwt.sign({}, secret, { subject: userId, expiresIn: ACCESS_TTL_SEC, algorithm: 'HS256' });
  const refreshToken = randomBytes(48).toString('base64url');
  await db.insert(refreshTokens).values({
    userId,
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000),
  });
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SEC };
}

/** Single-use refresh: the old token is deleted and a new pair is issued. */
export async function rotateRefreshToken(db: Db, secret: string, token: string): Promise<Tokens> {
  const [row] = await db
    .delete(refreshTokens)
    .where(and(eq(refreshTokens.tokenHash, sha256(token)), gt(refreshTokens.expiresAt, new Date())))
    .returning({ userId: refreshTokens.userId });
  if (!row) throw new HttpError(401, 'invalid_refresh_token');
  return issueTokens(db, secret, row.userId);
}

export async function revokeRefreshToken(db: Db, token: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, sha256(token)));
}

export function requireAuth(secret: string): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next(new HttpError(401, 'unauthorized'));
    try {
      const payload = jwt.verify(header.slice(7), secret, { algorithms: ['HS256'] });
      if (typeof payload === 'string' || !payload.sub) throw new Error('bad token');
      (req as AuthedRequest).userId = payload.sub;
      next();
    } catch {
      next(new HttpError(401, 'unauthorized'));
    }
  };
}

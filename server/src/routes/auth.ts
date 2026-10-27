import { eq } from 'drizzle-orm';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { hashPassword, issueTokens, revokeRefreshToken, rotateRefreshToken, verifyPassword } from '../auth';
import type { Db } from '../db/client';
import { users } from '../db/schema';
import { handler, HttpError } from '../http';

const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((e) => e.trim().toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

// Compared against when the email is unknown, so failed lookups take as long as wrong passwords.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword('not-a-real-password'));

export function authRoutes(db: Db, secret: string, opts: { rateLimit: boolean }): Router {
  const r = Router();
  if (opts.rateLimit) r.use(rateLimit({ windowMs: 15 * 60_000, limit: 50, standardHeaders: 'draft-8', legacyHeaders: false }));

  r.post(
    '/register',
    handler(async (req, res) => {
      const { email, password } = credentials.parse(req.body);
      const passwordHash = await hashPassword(password);
      const [user] = await db.insert(users).values({ email, passwordHash }).onConflictDoNothing().returning({ id: users.id });
      if (!user) throw new HttpError(409, 'email_taken', 'An account with this email already exists');
      res.status(201).json(await issueTokens(db, secret, user.id));
    }),
  );

  r.post(
    '/login',
    handler(async (req, res) => {
      const { email, password } = credentials.parse(req.body);
      const [user] = await db.select().from(users).where(eq(users.email, email));
      const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
      if (!user || !ok) throw new HttpError(401, 'invalid_credentials', 'Wrong email or password');
      res.json(await issueTokens(db, secret, user.id));
    }),
  );

  r.post(
    '/refresh',
    handler(async (req, res) => {
      const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
      res.json(await rotateRefreshToken(db, secret, refreshToken));
    }),
  );

  r.post(
    '/logout',
    handler(async (req, res) => {
      const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
      await revokeRefreshToken(db, refreshToken);
      res.status(204).end();
    }),
  );

  return r;
}

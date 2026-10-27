import { and, eq, gt } from 'drizzle-orm';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { hashPassword, issueTokens, revokeRefreshToken, rotateRefreshToken, verifyPassword } from '../auth';
import type { Db } from '../db/client';
import { passwordResets, refreshTokens, users } from '../db/schema';
import { handler, HttpError } from '../http';
import type { Mailer } from '../mailer';
import { randomInt } from 'node:crypto';

const RESET_TTL_MIN = 15;
const RESET_MAX_ATTEMPTS = 5;

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

const emailField = credentials.shape.email;

export function authRoutes(db: Db, secret: string, opts: { rateLimit: boolean; mailer: Mailer }): Router {
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

  /** Email a 6-digit reset code. Always 204, so the endpoint can't be used to discover accounts. */
  r.post(
    '/password/forgot',
    handler(async (req, res) => {
      const email = emailField.parse(req.body?.email);
      const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      if (user) {
        const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
        const values = { codeHash: await hashPassword(code), expiresAt: new Date(Date.now() + RESET_TTL_MIN * 60_000), attempts: 0 };
        await db.insert(passwordResets).values({ userId: user.id, ...values }).onConflictDoUpdate({ target: passwordResets.userId, set: values });
        await opts.mailer.send(
          email,
          'Your Ascend Protocol reset code',
          `Your password reset code is ${code}.\n\nIt expires in ${RESET_TTL_MIN} minutes. If you didn't ask for this, ignore this email.`,
        );
      }
      res.status(204).end();
    }),
  );

  r.post(
    '/password/reset',
    handler(async (req, res) => {
      const body = z.object({ email: emailField, code: z.string().regex(/^\d{6}$/), password: credentials.shape.password }).parse(req.body);
      const invalid = new HttpError(400, 'invalid_code', 'That code is invalid or has expired');
      const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email));
      if (!user) throw invalid;
      const [reset] = await db
        .select()
        .from(passwordResets)
        .where(and(eq(passwordResets.userId, user.id), gt(passwordResets.expiresAt, new Date())));
      if (!reset || reset.attempts >= RESET_MAX_ATTEMPTS) throw invalid;
      if (!(await verifyPassword(body.code, reset.codeHash))) {
        await db.update(passwordResets).set({ attempts: reset.attempts + 1 }).where(eq(passwordResets.userId, user.id));
        throw invalid;
      }
      await db.update(users).set({ passwordHash: await hashPassword(body.password) }).where(eq(users.id, user.id));
      await db.delete(passwordResets).where(eq(passwordResets.userId, user.id));
      // Sign out every other device.
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));
      res.json(await issueTokens(db, secret, user.id));
    }),
  );

  return r;
}

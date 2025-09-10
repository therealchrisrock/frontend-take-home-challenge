import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { Resend } from "resend";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { env } from "~/env";

const resend = new Resend(env.RESEND_API_KEY);

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        username: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[a-zA-Z0-9_-]+$/),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingUser = await ctx.db.user.findFirst({
        where: {
          OR: [{ email: input.email }, { username: input.username }],
        },
      });

      if (existingUser) {
        if (existingUser.email === input.email) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already in use",
          });
        }
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username already taken",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          username: input.username,
          name: input.name,
        },
      });

      return { success: true, userId: user.id };
    }),

  setUsername: protectedProcedure
    .input(
      z.object({
        username: z
          .string()
          .min(3)
          .max(20)
          .regex(/^[a-zA-Z0-9_-]+$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const existingUser = await ctx.db.user.findUnique({
        where: { username: input.username },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username already taken",
        });
      }

      await ctx.db.user.update({
        where: { id: userId },
        data: { username: input.username },
      });

      return { success: true };
    }),

  checkUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { username: input.username },
      });
      return { available: !user };
    }),

  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        // Don't reveal whether email exists
        return { success: true };
      }

      // Delete any existing tokens
      await ctx.db.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Create new token
      const token = nanoid(32);
      const expires = new Date(Date.now() + 3600000); // 1 hour

      await ctx.db.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expires,
        },
      });

      // Send email
      const resetUrl = `${env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
      console.log(resetUrl);
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: input.email,
        subject: "Password Reset Request",
        html: `
          <h2>Password Reset Request</h2>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });

      return { success: true };
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const resetToken = await ctx.db.passwordResetToken.findUnique({
        where: { token: input.token },
        include: { user: true },
      });

      if (!resetToken) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired token",
        });
      }

      if (resetToken.expires < new Date()) {
        await ctx.db.passwordResetToken.delete({
          where: { id: resetToken.id },
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token has expired",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      await ctx.db.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      });

      await ctx.db.passwordResetToken.delete({
        where: { id: resetToken.id },
      });

      return { success: true };
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        image: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
      });
      return { success: true };
    }),
});

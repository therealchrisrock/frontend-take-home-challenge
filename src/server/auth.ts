import { PrismaAdapter } from "@auth/prisma-adapter";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import { type Adapter } from "next-auth/adapters";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { env } from "~/env";
import { db } from "~/server/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      username: string;
      needsUsername: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    username: string;
    needsUsername?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    username: string;
    needsUsername: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.userId,
        username: token.username,
        needsUsername: token.needsUsername,
      },
    }),
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.userId = user.id;
        token.username = user.username;
        token.needsUsername = user.username.startsWith('user_');
      }

      if (trigger === "update" && session?.username) {
        token.username = session.username;
        token.needsUsername = false;
      }

      return token;
    },
  },
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    DiscordProvider({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        emailOrUsername: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.emailOrUsername || !credentials?.password) {
          return null;
        }

        // Check if input is email or username
        const isEmail = credentials.emailOrUsername.includes("@");
        
        const user = await db.user.findFirst({
          where: isEmail
            ? { email: credentials.emailOrUsername }
            : { username: credentials.emailOrUsername },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          image: user.image,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    newUser: "/auth/new-user",
  },
  session: {
    strategy: "jwt",
  },
  events: {
    async createUser({ user }) {
      // Generate temporary username for OAuth users who don't have one
      if (!user.username) {
        const tempUsername = `user_${user.id.slice(-8)}`;
        await db.user.update({
          where: { id: user.id },
          data: { username: tempUsername },
        });
        user.username = tempUsername;
      }
    },
  },
};

export const getServerAuthSession = () => getServerSession(authOptions);
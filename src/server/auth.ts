import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import { type Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";
import { env } from "~/env";
import { db } from "~/server/db";

// Module augmentations for NextAuth are declared in src/types/next-auth.d.ts

export const authOptions: NextAuthOptions = {
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.userId,
        username: token.username,
        needsUsername: token.needsUsername,
        image: token.image || session.user?.image,
      },
    }),
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.userId = user.id;
        token.username = user.username;
        token.needsUsername = user.username.startsWith("user_");
        token.image = user.image;
      }

      if (trigger === "update" && session?.username) {
        token.username = session.username;
        token.needsUsername = false;
      }

      // If trigger is "update" and we have image data, update the token
      if (trigger === "update" && session?.image !== undefined) {
        token.image = session.image;
      }

      return token;
    },
    signIn: async ({ user, account, profile }) => {
      // For OAuth providers, ensure user has a username before allowing sign in
      if (account?.provider === "discord") {
        if (!user.username) {
          // Generate a placeholder username
          const tempUsername = `user_${user.id?.slice(-8) || Date.now().toString().slice(-8)}`;
          user.username = tempUsername;
        }
      }
      return true;
    },
  },
  adapter: {
    ...PrismaAdapter(db),
    createUser: async (data) => {
      // Ensure username is provided for new users
      const username =
        data.username || `user_${Date.now().toString().slice(-8)}`;

      const user = await db.user.create({
        data: {
          ...data,
          username,
        },
      });

      return {
        ...user,
        needsUsername: username.startsWith("user_"),
      };
    },
  } as Adapter,
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

        if (!user?.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordValid) {
          return null;
        }

        const safeUsername = user.username ?? `user_${user.id.slice(-8)}`;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: safeUsername,
          image: user.image,
          needsUsername: safeUsername.startsWith("user_"),
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
};

/**
 * Retrieves the current server-side authentication session using the configured auth options.
 * Useful for accessing the authenticated user's session data in server components or API routes.
 *
 * @returns {Promise<Session | null>} The current session object or null if not authenticated.
 */
export const getServerAuthSession = () => getServerSession(authOptions);

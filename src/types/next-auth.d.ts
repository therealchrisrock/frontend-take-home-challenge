import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      username: string;
      needsUsername: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    needsUsername?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    username: string;
    needsUsername: boolean;
    image?: string | null;
  }
}

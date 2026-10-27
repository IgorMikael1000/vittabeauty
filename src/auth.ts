import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getPrismaClient } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        const professional = await getPrismaClient().professional.findUnique({
          where: { email },
        });

        if (
          !professional ||
          !(await compare(credentials.password, professional.passwordHash))
        ) {
          return null;
        }

        return {
          id: professional.id,
          name: professional.name,
          email: professional.email,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (!token.sub) {
        throw new Error("Authenticated session is missing its professional ID.");
      }

      session.user.id = token.sub;
      return session;
    },
  },
});

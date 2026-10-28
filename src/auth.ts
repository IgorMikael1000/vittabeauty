import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyFirebaseIdToken } from "@/lib/firebase-id-token";
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
        idToken: { label: "Firebase ID token", type: "text" },
      },
      async authorize(credentials) {
        if (typeof credentials?.idToken !== "string") {
          return null;
        }

        const identity = await verifyFirebaseIdToken(credentials.idToken);
        if (!identity?.emailVerified) {
          return null;
        }

        const prisma = getPrismaClient();
        let professional = await prisma.professional.findUnique({
          where: { firebaseUid: identity.uid },
        });
        if (!professional) {
          professional = await prisma.professional.findUnique({
            where: { email: identity.email },
          });
        }
        if (
          !professional ||
          professional.email !== identity.email ||
          (professional.firebaseUid !== null &&
            professional.firebaseUid !== identity.uid)
        ) {
          return null;
        }
        if (!professional.firebaseUid) {
          await prisma.professional.update({
            where: { id: professional.id },
            data: { firebaseUid: identity.uid, passwordHash: null },
          });
        } else {
          await prisma.professional.updateMany({
            where: { id: professional.id, firebaseUid: identity.uid },
            data: { passwordHash: null },
          });
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

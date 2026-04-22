import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { rateLimit } from "./rate-limit";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate-limit brute force attempts per email (5 / 5 min)
        const rl = await rateLimit(`login:${credentials.email.toLowerCase()}`, 5, 300);
        if (!rl.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: {
            memberships: {
              include: { organization: true },
              where: { organization: { isActive: true } },
              take: 1,
            },
          },
        });

        if (!user || !user.isActive) return null;

        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        const membership = user.memberships[0];

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          isSuperAdmin: user.isSuperAdmin,
          organizationId: membership?.organizationId || "",
          orgRole: membership?.role || "MEMBER",
          orgName: membership?.organization.name || "",
          orgSlug: membership?.organization.slug || "",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (trigger === "update") {
        const freshUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: {
            memberships: {
              where: { organization: { isActive: true } },
              include: { organization: true },
            },
          },
        });
        if (freshUser) {
          token.name = freshUser.name;
          token.email = freshUser.email;
        }
      }
      if (user) {
        const u = user as {
          id: string;
          isSuperAdmin: boolean;
          organizationId: string;
          orgRole: string;
          orgName: string;
          orgSlug: string;
        };
        token.id = u.id;
        token.isSuperAdmin = u.isSuperAdmin;
        token.organizationId = u.organizationId;
        token.orgRole = u.orgRole;
        token.orgName = u.orgName;
        token.orgSlug = u.orgSlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.id;
        (session.user as Record<string, unknown>).isSuperAdmin =
          token.isSuperAdmin;
        (session.user as Record<string, unknown>).organizationId =
          token.organizationId;
        (session.user as Record<string, unknown>).orgRole = token.orgRole;
        (session.user as Record<string, unknown>).orgName = token.orgName;
        (session.user as Record<string, unknown>).orgSlug = token.orgSlug;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

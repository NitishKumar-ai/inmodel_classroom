import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as import("next-auth/adapters").Adapter,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" }, // For initial creation/selection in this scaffold
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // Simple scaffold logic: create user if not exists (for demo purposes)
        if (!user) {
          const hashedPassword = await bcrypt.hash(credentials.password, 10);
          const newUser = await prisma.user.create({
            data: {
              email: credentials.email,
              password: hashedPassword,
              name: credentials.email.split("@")[0],
              role: (credentials.role as Role) || Role.STUDENT,
            },
          });
          return newUser;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password!);

        if (!isPasswordValid) {
          return null;
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.onboardingComplete = user.onboardingComplete;
      }
      
      // Handle the 'update' trigger from useSession().update()
      if (trigger === "update" && session) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (dbUser) {
          token.name = dbUser.name;
          token.onboardingComplete = dbUser.onboardingComplete;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as Role;
        session.user.id = token.id as string;
        session.user.onboardingComplete = token.onboardingComplete as boolean;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

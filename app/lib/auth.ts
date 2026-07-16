import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/app/lib/prisma";
import { admin } from "better-auth/plugins";

const rawEnvVal = process.env.ADMIN_USER_IDS || process.env.ADMIN_USER_ID;
const adminUserIds = rawEnvVal
  ? rawEnvVal.split(",").map((id) => id.trim())
  : [];

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    "https://premises-snout-surgery.ngrok-free.dev",
    "https://*.ngrok-free.app",
    "https://*.ngrok.app",
    "https://*.ngrok.io",
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (adminUserIds.includes(user.id)) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: "admin" },
            });
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          if (adminUserIds.includes(session.userId)) {
            const user = await prisma.user.findUnique({
              where: { id: session.userId },
            });
            if (user && user.role !== "admin") {
              await prisma.user.update({
                where: { id: session.userId },
                data: { role: "admin" },
              });
            }
          }
        },
      },
    },
  },
  plugins: [
    admin({
      adminUserIds: adminUserIds,
    }),
  ],
});

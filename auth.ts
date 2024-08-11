import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "./app/lib/db";
import bcrypt from "bcrypt";

const getUser = async (
  email: string
): Promise<Prisma.UsersGetPayload<null> | undefined> => {
  try {
    const user = await prisma.users.findUniqueOrThrow({ where: { email } });
    return user;
  } catch (error) {
    console.log("Failed to find user:", error);
    throw new Error("User not found");
  }
};

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user;
        }
        return null;
      },
    }),
  ],
});

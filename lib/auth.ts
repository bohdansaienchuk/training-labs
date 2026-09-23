import "server-only";

import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth/minimal";
import { createAuthOptions } from "./auth-options";
import { prisma } from "./prisma";

export const auth = betterAuth(
  createAuthOptions(
    prismaAdapter(prisma, {
      provider: "postgresql",
    }),
  ),
);

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import {
  normalizeProvisioningEmail,
  provisionExistingUser,
  ProvisioningError,
  type AttachCredentialResult,
} from "../lib/provision-user";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not defined");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const result = await provisionExistingUser(
    {
      email: process.env.PROVISION_USER_EMAIL,
      password: process.env.PROVISION_USER_PASSWORD,
    },
    {
      findUsersByEmail: (normalizedEmail) =>
        prisma.user.findMany({
          where: { email: { equals: normalizedEmail, mode: "insensitive" } },
          select: { id: true, email: true },
          take: 2,
        }),
      hashPassword,
      attachCredential: (input) =>
        prisma.$transaction(
          async (tx): Promise<AttachCredentialResult> => {
            const lockedUsers = await tx.$queryRaw<Array<{ id: number; email: string }>>`
              SELECT "id", "email" FROM "User" WHERE "id" = ${input.userId} FOR UPDATE
            `;
            const lockedUser = lockedUsers[0];
            if (!lockedUser) return "user-missing";
            if (normalizeProvisioningEmail(lockedUser.email) !== input.normalizedEmail) {
              return "email-changed";
            }

            const credential = await tx.account.findFirst({
              where: { userId: input.userId, providerId: "credential" },
              select: { id: true },
            });
            if (credential) return "credential-exists";

            await tx.account.create({
              data: {
                accountId: input.accountId,
                providerId: "credential",
                userId: input.userId,
                password: input.passwordHash,
              },
            });
            return "created";
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),
    },
  );

  console.log(`Credential attached to existing User ID ${result.userId}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof ProvisioningError ? error.message : "Credential provisioning failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

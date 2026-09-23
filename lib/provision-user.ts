import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from "./auth-options";

export type ProvisioningUser = {
  id: number;
  email: string;
};

export type AttachCredentialResult =
  | "created"
  | "credential-exists"
  | "user-missing"
  | "email-changed";

export type ProvisioningDependencies = {
  findUsersByEmail: (normalizedEmail: string) => Promise<ProvisioningUser[]>;
  hashPassword: (password: string) => Promise<string>;
  attachCredential: (input: {
    accountId: string;
    normalizedEmail: string;
    passwordHash: string;
    userId: number;
  }) => Promise<AttachCredentialResult>;
};

export class ProvisioningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProvisioningError";
  }
}

export function normalizeProvisioningEmail(value: unknown): string {
  if (typeof value !== "string") throw new ProvisioningError("Provisioning email is required");
  const email = value.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new ProvisioningError("Provisioning email is invalid");
  }
  return email;
}

export function validateProvisioningPassword(value: unknown): string {
  if (typeof value !== "string") throw new ProvisioningError("Provisioning password is required");
  if (value.length < AUTH_PASSWORD_MIN_LENGTH || value.length > AUTH_PASSWORD_MAX_LENGTH) {
    throw new ProvisioningError(
      `Provisioning password must contain ${AUTH_PASSWORD_MIN_LENGTH}-${AUTH_PASSWORD_MAX_LENGTH} characters`,
    );
  }
  return value;
}

export function selectProvisioningUser(users: ProvisioningUser[]): ProvisioningUser {
  if (users.length === 0) throw new ProvisioningError("Existing User was not found");
  if (users.length !== 1) throw new ProvisioningError("Provisioning email is ambiguous");
  return users[0];
}

export async function provisionExistingUser(
  input: { email: unknown; password: unknown },
  dependencies: ProvisioningDependencies,
): Promise<{ userId: number }> {
  const normalizedEmail = normalizeProvisioningEmail(input.email);
  const password = validateProvisioningPassword(input.password);
  const user = selectProvisioningUser(await dependencies.findUsersByEmail(normalizedEmail));
  const passwordHash = await dependencies.hashPassword(password);
  const result = await dependencies.attachCredential({
    accountId: String(user.id),
    normalizedEmail,
    passwordHash,
    userId: user.id,
  });

  if (result === "credential-exists") {
    throw new ProvisioningError("The existing User already has a credential account");
  }
  if (result === "user-missing" || result === "email-changed") {
    throw new ProvisioningError("The existing User changed during provisioning");
  }
  return { userId: user.id };
}

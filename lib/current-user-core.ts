export type SafeCurrentUser = {
  id: number;
  email: string;
  name: string;
};

export class InvalidAuthUserIdError extends Error {
  constructor() {
    super("Authenticated user ID is invalid");
    this.name = "InvalidAuthUserIdError";
  }
}

export function authUserIdToInteger(value: unknown): number {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    throw new InvalidAuthUserIdError();
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id) || id > 2_147_483_647) {
    throw new InvalidAuthUserIdError();
  }
  return id;
}

type SessionReader = () => Promise<{ user: { id: unknown } } | null>;
type UserReader = (id: number) => Promise<SafeCurrentUser | null>;

export async function resolveCurrentUser(
  readSession: SessionReader,
  readUser: UserReader,
): Promise<SafeCurrentUser | null> {
  const session = await readSession();
  if (!session) return null;

  let userId: number;
  try {
    userId = authUserIdToInteger(session.user.id);
  } catch (error) {
    if (error instanceof InvalidAuthUserIdError) return null;
    throw error;
  }

  return readUser(userId);
}

export class UnauthenticatedError extends Error {
  readonly code = "UNAUTHENTICATED";
  readonly status = 401;

  constructor() {
    super("Authentication required");
    this.name = "UnauthenticatedError";
  }
}

export async function requireResolvedUser(
  resolve: () => Promise<SafeCurrentUser | null>,
): Promise<SafeCurrentUser> {
  const user = await resolve();
  if (!user) throw new UnauthenticatedError();
  return user;
}

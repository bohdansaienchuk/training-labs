import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeProvisioningEmail,
  provisionExistingUser,
  ProvisioningError,
  selectProvisioningUser,
  validateProvisioningPassword,
} from "../lib/provision-user.ts";

const testPassword = "not-a-real-credential-123!";

test("provisioning normalizes and validates operator input", () => {
  assert.equal(normalizeProvisioningEmail("  Test@TrainingLabs.Local "), "test@traininglabs.local");
  assert.throws(() => normalizeProvisioningEmail("invalid"), ProvisioningError);
  assert.equal(validateProvisioningPassword(testPassword), testPassword);
  assert.throws(() => validateProvisioningPassword("too-short"), ProvisioningError);
});

test("provisioning selects exactly one existing User", () => {
  const user = { id: 1, email: "test@traininglabs.local" };
  assert.equal(selectProvisioningUser([user]), user);
  assert.throws(() => selectProvisioningUser([]), /not found/);
  assert.throws(() => selectProvisioningUser([user, { id: 2, email: user.email }]), /ambiguous/);
});

test("provisioning attaches a Better Auth credential to the selected User without creating a User", async () => {
  const calls = [];
  const result = await provisionExistingUser(
    { email: " Test@TrainingLabs.Local ", password: testPassword },
    {
      findUsersByEmail: async (email) => {
        calls.push(["find", email]);
        return [{ id: 1, email: "test@traininglabs.local" }];
      },
      hashPassword: async (password) => {
        calls.push(["hash", password]);
        return "library-compatible-test-hash";
      },
      attachCredential: async (input) => {
        calls.push(["attach", input]);
        return "created";
      },
    },
  );

  assert.deepEqual(result, { userId: 1 });
  assert.deepEqual(calls, [
    ["find", "test@traininglabs.local"],
    ["hash", testPassword],
    ["attach", {
      accountId: "1",
      normalizedEmail: "test@traininglabs.local",
      passwordHash: "library-compatible-test-hash",
      userId: 1,
    }],
  ]);
});

test("missing or ambiguous Users fail before password hashing", async () => {
  for (const users of [[], [
    { id: 1, email: "test@traininglabs.local" },
    { id: 2, email: "TEST@traininglabs.local" },
  ]]) {
    let hashed = false;
    await assert.rejects(
      provisionExistingUser(
        { email: "test@traininglabs.local", password: testPassword },
        {
          findUsersByEmail: async () => users,
          hashPassword: async () => {
            hashed = true;
            return "unused";
          },
          attachCredential: async () => "created",
        },
      ),
      ProvisioningError,
    );
    assert.equal(hashed, false);
  }
});

test("an existing credential fails safely without replacement or overwrite", async () => {
  let attachInput;
  await assert.rejects(
    provisionExistingUser(
      { email: "test@traininglabs.local", password: testPassword },
      {
        findUsersByEmail: async () => [{ id: 1, email: "test@traininglabs.local" }],
        hashPassword: async () => "unused-test-hash",
        attachCredential: async (input) => {
          attachInput = input;
          return "credential-exists";
        },
      },
    ),
    /already has a credential account/,
  );
  assert.equal(attachInput.userId, 1);
  assert.equal(attachInput.accountId, "1");
});

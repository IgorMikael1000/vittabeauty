import { describe, expect, it } from "vitest";
import { getAccountDeletionErrorDetails } from "./account-deletion-logger";

describe("getAccountDeletionErrorDetails", () => {
  it("redacts credentials and personal information from error messages", () => {
    const details = getAccountDeletionErrorDetails(
      new Error(
        "Failed for user@example.com CPF 123.456.789-00 using " +
          "postgresql://db-user:db-password@db.example.com/app " +
          "token=private-token",
      ),
    );

    expect(details.errorMessage).not.toContain("user@example.com");
    expect(details.errorMessage).not.toContain("123.456.789-00");
    expect(details.errorMessage).not.toContain("db-password");
    expect(details.errorMessage).not.toContain("private-token");
    expect(details.errorMessage).toContain("[REDACTED_EMAIL]");
    expect(details.errorMessage).toContain("[REDACTED_CPF]");
  });
});

import { describe, it, expect } from "vitest";
import { googleAuthUrl, githubAuthUrl } from "@/lib/auth/oauth";

describe("oauth provider URLs", () => {
  it("builds Google and GitHub authorize URLs with state", () => {
    const prevG = process.env.GOOGLE_CLIENT_ID;
    const prevH = process.env.GITHUB_CLIENT_ID;
    process.env.GOOGLE_CLIENT_ID = "google-public-id";
    process.env.GITHUB_CLIENT_ID = "github-public-id";
    process.env.AUTH_APP_URL = "http://localhost:3000";

    const google = googleAuthUrl("csrf-state");
    const github = githubAuthUrl("csrf-state");
    expect(google).toContain("accounts.google.com");
    expect(google).toContain("state=csrf-state");
    expect(google).toContain("client_id=google-public-id");
    expect(google).not.toContain("SECRET");
    expect(github).toContain("github.com/login/oauth/authorize");
    expect(github).toContain("state=csrf-state");

    process.env.GOOGLE_CLIENT_ID = prevG;
    process.env.GITHUB_CLIENT_ID = prevH;
  });

  it("does not start OAuth without server-side client IDs", () => {
    const prevG = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    expect(() => googleAuthUrl("x")).toThrow(/GOOGLE_CLIENT_ID/);
    process.env.GOOGLE_CLIENT_ID = prevG;
  });
});

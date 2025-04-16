import { describe, expect, it } from "vitest";
import { parseGithubRepo } from "action-get-release";

describe("github", () => {
  it("repositories can be parsed", async () => {
    expect(parseGithubRepo("  https://github.com/some-user/some-repo")).toEqual(
      { repo: "some-repo", owner: "some-user" },
    );
    expect(parseGithubRepo("https://github.com/some-user/some-repo")).toEqual({
      repo: "some-repo",
      owner: "some-user",
    });
    expect(parseGithubRepo("github.com/some-user/some-repo")).toEqual({
      repo: "some-repo",
      owner: "some-user",
    });
    expect(parseGithubRepo("some-user/some-repo/branch/main")).toEqual({
      repo: "some-repo",
      owner: "some-user",
    });
    expect(parseGithubRepo("some-user/some-repo")).toEqual({
      repo: "some-repo",
      owner: "some-user",
    });
    expect(() => parseGithubRepo("some-repo")).toThrow(Error);
  });
});

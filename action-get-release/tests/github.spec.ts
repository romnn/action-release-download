import { describe, expect, it } from "vitest";
import { parseGithubRepo } from "action-get-release";

describe("github", () => {
  it("repositories can be parsed", () => {
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

  it("extracts owner/repo from refs carrying a version tag", () => {
    const expected = { repo: "some-repo", owner: "some-user" };
    expect(parseGithubRepo("some-user/some-repo/releases/tag/v1.2.3")).toEqual(
      expected,
    );
    expect(
      parseGithubRepo(
        "https://github.com/some-user/some-repo/releases/tag/v0.0.39",
      ),
    ).toEqual(expected);
    expect(
      parseGithubRepo("https://github.com/some-user/some-repo/tree/v2.0.0"),
    ).toEqual(expected);
    expect(
      parseGithubRepo("some-user/some-repo/releases/download/v1.0.0/asset.zip"),
    ).toEqual(expected);
  });
});

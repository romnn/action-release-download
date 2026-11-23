import { describe, expect, it } from "vitest";
import { parseGithubRepo, withRetries } from "action-get-release";

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

  describe("release lookups", () => {
    // Records the delays instead of sleeping, so the retries run instantly.
    function recordingWait(): {
      waits: number[];
      wait: (ms: number) => Promise<void>;
    } {
      const waits: number[] = [];
      return { waits, wait: async (ms) => void waits.push(ms) };
    }

    // A request that fails with each given status in turn, then answers `release`.
    function failing(statuses: (number | undefined)[]) {
      let attempts = 0;
      const request = async () => {
        const status = statuses[attempts++];
        if (attempts <= statuses.length)
          throw Object.assign(new Error("failed"), { status });
        return "release";
      };
      return { request, attempts: () => attempts };
    }

    it("retries a request that got no response or a server error", async () => {
      const { waits, wait } = recordingWait();
      const { request, attempts } = failing([500, undefined]);
      await expect(withRetries(request, wait)).resolves.toBe("release");
      expect(attempts()).toBe(3);
      expect(waits).toEqual([1000, 2000]);
    });

    it("fails at once for a release that does not exist", async () => {
      const { waits, wait } = recordingWait();
      const { request, attempts } = failing([404]);
      await expect(withRetries(request, wait)).rejects.toMatchObject({
        status: 404,
      });
      expect(attempts()).toBe(1);
      expect(waits).toEqual([]);
    });

    it("gives up after three attempts", async () => {
      const { wait } = recordingWait();
      const { request, attempts } = failing([503, 503, 503]);
      await expect(withRetries(request, wait)).rejects.toMatchObject({
        status: 503,
      });
      expect(attempts()).toBe(3);
    });
  });
});

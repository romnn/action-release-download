import { afterEach, describe, expect, it, vi } from "vitest";
import { parseGithubRepo, Repo } from "action-get-release";

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
    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    const release = {
      id: 1,
      tag_name: "v1.0.0",
      published_at: null,
      assets: [],
    };
    const answer = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });

    it("retries a lookup that got no response or a server error", async () => {
      vi.useFakeTimers();
      const fetch = vi
        .fn()
        .mockRejectedValueOnce(new TypeError("fetch failed"))
        .mockResolvedValueOnce(answer(502, { message: "Bad Gateway" }))
        .mockResolvedValueOnce(answer(200, release));
      vi.stubGlobal("fetch", fetch);

      const lookup = new Repo({
        repo: "some-user/some-repo",
        token: "t",
      }).getLatestRelease();
      await vi.runAllTimersAsync();

      expect((await lookup).tag()).toBe("v1.0.0");
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it("fails at once for a release that does not exist or a rate limit", async () => {
      for (const status of [404, 429]) {
        const fetch = vi
          .fn()
          .mockResolvedValue(answer(status, { message: "no" }));
        vi.stubGlobal("fetch", fetch);

        const repo = new Repo({ repo: "some-user/some-repo", token: "t" });
        await expect(repo.getReleaseByTag("v1.0.0")).rejects.toMatchObject({
          status,
        });
        expect(fetch).toHaveBeenCalledTimes(1);
      }
    });

    it("gives up after three attempts", async () => {
      vi.useFakeTimers();
      const fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
      vi.stubGlobal("fetch", fetch);

      const lookup = new Repo({
        repo: "some-user/some-repo",
        token: "t",
      }).getLatestRelease();
      const failed = expect(lookup).rejects.toMatchObject({ status: 500 });
      await vi.runAllTimersAsync();

      await failed;
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });
});

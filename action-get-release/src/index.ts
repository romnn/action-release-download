import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import { Octokit } from "@octokit/core";
import { Endpoints } from "@octokit/types";
import * as path from "path";
import { dirExists, stripExtension } from "./utils.js";

type GitHubRelease =
  Endpoints["GET /repos/{owner}/{repo}/releases/latest"]["response"];

type GitHubReleaseAsset =
  Endpoints["GET /repos/{owner}/{repo}/releases/latest"]["response"]["data"]["assets"][0];

const ACTION_REPO =
  process.env.GITHUB_ACTION_REPOSITORY_OVERRIDE ??
  process.env.GITHUB_ACTION_REPOSITORY;

/** How many times a release lookup is attempted before its failure is final. */
const RELEASE_LOOKUP_ATTEMPTS = 3;

/**
 * Runs a GitHub API request, retrying a failure that a later attempt can survive.
 *
 * A request that got no response, such as a connect timeout to api.github.com, which Octokit
 * reports with status 500, or one answered with a server error or a rate limit, is tried again
 * after 1 s and then 2 s.
 * Any other failure, such as a release that does not exist, is final at once.
 */
export async function withRetries<T>(
  request: () => Promise<T>,
  wait: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await request();
    } catch (err: unknown) {
      if (attempt >= RELEASE_LOOKUP_ATTEMPTS || !transient(err)) throw err;
      await wait(1000 * 2 ** (attempt - 1));
    }
  }
}

/** Whether a failed request may succeed when tried again. */
function transient(err: unknown): boolean {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status !== "number" || status >= 500 || status === 429;
}

export interface GitHubRepositoryName {
  repo: string;
  owner: string;
}

export function parseGithubRepo(repo: string): GitHubRepositoryName {
  const match = repo.match(/([a-z-_]+)(?<!(github\.com))\/([a-z-_]+)(?:\/.*)?/);

  if (!match || match.length < 4)
    throw new Error(`failed to parse github repository ${repo}`);
  return { owner: match[1], repo: match[3] };
}

export class Asset {
  public asset: GitHubReleaseAsset;
  public release: Release;

  constructor({
    release,
    asset,
  }: {
    release: Release;
    asset: GitHubReleaseAsset;
  }) {
    this.asset = asset;
    this.release = release;
  }

  id(): string {
    return `${this.release.repo.fullName()}/asset/${this.asset.id}@${
      this.asset.updated_at
    }`;
  }
  downloadUrl(): string {
    return this.asset.browser_download_url;
  }
  name(): string {
    return this.asset.name;
  }
}

function ensureCacheToolKey(key?: string): string {
  if (!key || key === "") {
    throw new Error(
      `cannot determine key for the cache. The GITHUB_ACTION_REPOSITORY env variable is not defined and cacheToolKey is not set.`,
    );
  }
  return key;
}

export class Release {
  public release: GitHubRelease;
  public repo: Repo;

  constructor({ repo, release }: { repo: Repo; release: GitHubRelease }) {
    this.repo = repo;
    this.release = release;
  }

  tag(): string {
    return this.release.data.tag_name;
  }
  id(): string {
    return `${this.repo.fullName()}/${this.release.data.id}@${
      this.release.data.published_at
    }`;
  }

  assets(): Asset[] {
    return this.release.data.assets.map((asset) => {
      return new Asset({ release: this, asset });
    });
  }

  async download(
    asset: Asset,
    { dest, unarchive }: { dest?: string; unarchive?: boolean } = {},
  ): Promise<string> {
    if (!dest || !(await dirExists(dest))) {
      dest = process.env.RUNNER_TEMP;
    }

    if (!dest || !(await dirExists(dest))) {
      throw new Error(
        "failed to determine destination path for download: not specified and the RUNNER_TEMP env variable is not defined.",
      );
    }

    const downloaded = await tc.downloadTool(
      asset.downloadUrl(),
      path.join(dest, asset.name()),
    );

    if (unarchive ?? true) {
      const ext = path.extname(asset.name());
      core.debug(`unarchiving ${downloaded} based on file extension ${ext}`);

      const unarchiveDest = stripExtension(path.join(dest, asset.name()));
      switch (ext) {
        case ".pkg":
          return await tc.extractXar(downloaded, unarchiveDest);
        case ".zip":
          return await tc.extractZip(downloaded, unarchiveDest);
        case ".tar":
        case ".gz":
          return await tc.extractTar(downloaded, unarchiveDest);
        case ".7z":
          return await tc.extract7z(downloaded, unarchiveDest);
        default:
      }
    }
    return downloaded;
  }

  async downloadAsset(
    name: string,
    {
      dest,
      cache,
      cacheToolKey,
      unarchive,
    }: {
      dest?: string;
      cache?: boolean;
      cacheToolKey?: string;
      unarchive?: boolean;
    } = {},
  ): Promise<string> {
    const useCache = cache ?? true;

    if (!cacheToolKey || cacheToolKey === "") {
      cacheToolKey = ACTION_REPO;
    }

    core.info(`downloading asset ${name}`);

    const releaseKey = this.id();

    const asset = this.assets().find((asset) => asset.name() === name);
    if (!asset) {
      const releaseName = `${this.repo.fullName()}/${this.tag()}`;
      core.error(`release ${releaseName} has no asset ${name}`);
      core.error(`available assets: ${JSON.stringify(this.assets())}`);
      throw new Error(`release ${releaseName} has no asset ${name}`);
    }

    const assetKey = asset.id();
    let downloaded: string | undefined = undefined;
    if (useCache) {
      downloaded = tc.find(
        ensureCacheToolKey(cacheToolKey),
        releaseKey,
        assetKey,
      );
    }
    if (!downloaded) {
      downloaded = await this.download(asset, { dest, unarchive });
      if (useCache) {
        downloaded = await tc.cacheDir(
          downloaded,
          ensureCacheToolKey(cacheToolKey),
          releaseKey,
          assetKey,
        );
      }
    }
    return downloaded;
  }
}

export class Repo {
  private api: Octokit;
  public repo: GitHubRepositoryName;

  fullName(): string {
    return `${this.owner()}/${this.name()}`;
  }

  name(): string {
    return this.repo.repo;
  }

  owner(): string {
    return this.repo.owner;
  }

  constructor({
    repo,
    token,
    githubApiBaseUrl,
  }: { repo?: string; token?: string; githubApiBaseUrl?: string } = {}) {
    if (!repo || repo === "") {
      repo = ACTION_REPO;
    }
    if (!repo || repo === "") {
      throw new Error("repository not specified");
    }
    this.repo = parseGithubRepo(repo);

    if (!token || token === "") {
      token = process.env.GITHUB_TOKEN;
    }
    this.api = new Octokit({ auth: token, baseUrl: githubApiBaseUrl });
  }

  async getReleaseByTag(tag: string): Promise<Release> {
    const release = await withRetries(() =>
      this.api.request("GET /repos/{owner}/{repo}/releases/tags/{tag}", {
        tag,
        ...this.repo,
      }),
    );
    return new Release({ repo: this, release });
  }

  async getLatestRelease(): Promise<Release> {
    const release = await withRetries(() =>
      this.api.request("GET /repos/{owner}/{repo}/releases/latest", {
        ...this.repo,
      }),
    );
    return new Release({ repo: this, release });
  }
}

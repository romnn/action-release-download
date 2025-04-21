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
    if (!cacheToolKey || cacheToolKey === "") {
      cacheToolKey = ACTION_REPO;
    }
    if (!cacheToolKey || cacheToolKey === "") {
      throw new Error(
        `cannot determine key for the cache. The GITHUB_ACTION_REPOSITORY env variable is not defined and cacheToolKey is not set.`,
      );
    }

    core.info(`downloading asset ${name}`);

    const releaseKey = this.id();
    const useCache = cache ?? true;

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
      downloaded = tc.find(cacheToolKey, releaseKey, assetKey);
    }
    if (!downloaded) {
      downloaded = await this.download(asset, { dest, unarchive });
      if (useCache) {
        downloaded = await tc.cacheDir(
          downloaded,
          cacheToolKey,
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
    const release = await this.api.request(
      "GET /repos/{owner}/{repo}/releases/tags/{tag}",
      { tag, ...this.repo },
    );
    return new Release({ repo: this, release });
  }

  async getLatestRelease(): Promise<Release> {
    const release = await this.api.request(
      "GET /repos/{owner}/{repo}/releases/latest",
      { ...this.repo },
    );
    return new Release({ repo: this, release });
  }
}

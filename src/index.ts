import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import {Octokit} from '@octokit/core'
import {Endpoints} from '@octokit/types'
import {promises as fs} from "fs";
import * as path from 'path';
export * from "./rust";

export type Architecture = typeof process.arch;
export type Platform = typeof process.platform;

type GitHubRelease =
    Endpoints['GET /repos/{owner}/{repo}/releases/latest']['response'];

type GitHubReleaseAsset =
    Endpoints['GET /repos/{owner}/{repo}/releases/latest']['response']['data']['assets'][0];

export interface GitHubRepositoryName {
  repo: string;
  owner: string;
}

export function parseGithubRepo(repo: string): GitHubRepositoryName {
  const match = repo.match(/(?:github\.com\/)?([a-z]+)\/([a-z-_]+)(?:\/.*)?/);
  if (!match || match.length != 3)
    throw new Error(`failed to parse github repository ${repo}`);
  return { owner: match[1], repo: match[2] }
}

async function dirExists(path: string): Promise<boolean> {
  const stat = await fs.lstat(path);
  return await stat.isDirectory();
}

export class Asset {
  public asset: GitHubReleaseAsset;
  public release: Release;

  constructor({release, asset}: {release: Release, asset: GitHubReleaseAsset}) {
    this.asset = asset;
    this.release = release;
  }

  id(): string {
    return `${this.release.repo.fullName()}/asset/${this.asset.id}@${
        this.asset.updated_at}`;
  }
  downloadUrl(): string { return this.asset.browser_download_url; }
  name(): string { return this.asset.name; }
}

export class Release {
  public release: GitHubRelease;
  public repo: Repo;

  constructor({repo, release}: {repo: Repo, release: GitHubRelease}) {
    this.repo = repo;
    this.release = release;
  }

  tag(): string { return this.release.data.tag_name; }
  id(): string {
    return `${this.repo.fullName()}/${this.release.data.id}@${
        this.release.data.published_at}`;
  }

  assets(): Asset[] {
    // console.log(this.release.data.assets);
    return this.release.data.assets.map(
        (asset) => { return new Asset({release : this, asset}); });
  }

  async download(asset: Asset,
                 {dest, unarchive}: {dest?: string, unarchive?: boolean} = {}):
      Promise<string> {
    if (!dest || !await dirExists(dest)) {
      dest = process.env.RUNNER_TEMP;
    }

    if (!dest || !await dirExists(dest)) {
      throw new Error(
          "failed to determine destination path for download: not specified and the RUNNER_TEMP env variable is not defined.");
    }

    const downloaded = await tc.downloadTool(asset.downloadUrl(),
                                             path.join(dest, asset.name()));

    if (unarchive ?? true) {
      const ext = path.extname(asset.name());
      core.debug(`unarchiving ${downloaded} based on file extension ${ext}`);

      switch (ext) {
      case ".pkg":
        return await tc.extractXar(downloaded, dest);
      case ".zip":
        return await tc.extractZip(downloaded, dest);
      case ".tar":
      case ".gz":
        return await tc.extractTar(downloaded, dest);
      case ".7z":
        return await tc.extract7z(downloaded, dest);
      default:
      }
    }
    return downloaded;
  }

  async downloadAsset(name: string, {dest, cache, cacheToolKey, unarchive}: {
    dest?: string,
    cache?: boolean,
    cacheToolKey?: string
    unarchive?: boolean
  } = {}): Promise<string> {
      if (!cacheToolKey || cacheToolKey === "") {
        cacheToolKey = process.env.GITHUB_ACTION_REPOSITORY;
      }
      if (!cacheToolKey || cacheToolKey === "") {
        throw new Error(
            `cannot determine key for the cache. The GITHUB_ACTION_REPOSITORY env variable is not defined and cacheToolKey is not set.`);
      }

      core.info(`downloading asset with name ${name}`);

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
      let downloaded: string|undefined = undefined;
      if (useCache) {
        downloaded = tc.find(cacheToolKey, releaseKey, assetKey);
      }
      if (!downloaded) {
        downloaded = await this.download(asset, {dest, unarchive});
        if (useCache) {
          downloaded =
              await tc.cacheDir(downloaded, cacheToolKey, releaseKey, assetKey);
        }
      }
      return downloaded;
    }
}

export class Repo {
  private api: Octokit;
  public repo: GitHubRepositoryName;

  fullName(): string { return `${this.owner()}/${this.name()}`; }

  name(): string{return this.repo.repo}

  owner(): string{return this.repo.owner}

  constructor({repo, token}: {repo?: string, token?: string} = {}) {
    if (!repo || repo === "") {
      repo = process.env.GITHUB_REPOSITORY;
    }
    if (!repo || repo === "") {
      throw new Error("repository not specified");
    }
    this.repo = parseGithubRepo(repo);

    if (!token || token === "") {
      token = process.env.GITHUB_TOKEN;
    }
    this.api = new Octokit({auth : token});
  }

  async getReleaseByTag(tag: string): Promise<Release> {
    const release = await this.api.request(
        'GET /repos/{owner}/{repo}/releases/tags/{tag}', {tag, ...this.repo});
    // console.log(release);
    return new Release({repo : this, release});
  }

  async getLatestRelease(): Promise<Release> {
    const release = await this.api.request(
        'GET /repos/{owner}/{repo}/releases/latest', {...this.repo});
    // console.log(release);
    return new Release({repo : this, release});
  }
}

import * as tc from "@actions/tool-cache";
import {Octokit} from '@octokit/core'
import {Endpoints} from '@octokit/types'
import * as path from 'path';
import * as url from 'url';
export * from "./rust";

// GET /repos/{owner}/{repo}/releases/assets/{asset_id}
// GET /repos/{owner}/{repo}/releases/{release_id}
// GET /repos/{owner}/{repo}/releases/latest

// const {RUNNER_TEMP} = process.env;
// const {platform : PLATFORM} = process;

// export type NodePlatform =
//     'linux'|'darwin'|'win32'|'aix'|'freebsd'|'openbsd'|'sunos';

// export type NodeArch =
//     'arm'|'arm64'|'ia32'|'mips'|'mipsel'|'ppc'|'ppc64'|'s390'|'s390x'|'x64';

export type Architecture = typeof process.arch;
export type Platform = typeof process.platform;

// async function downloadTar(os: OS): Promise<string> {
// 	const file = {FILE_PREFIX}-${os}-x64.tar.gz
// 	const url = {BASE_URL}/${file}
// 	const downloadPath = await tc.downloadTool(url);
// 	const extractPath = await tc.extractTar(downloadPath, RUNNER_TEMP);
// 	const extractedFile = path.join(extractPath, BINARY_NAME);

// 	return tc.cacheFile(extractedFile, BINARY_NAME, ACTION_NAME, VERSION);
// }

type GitHubRelease =
    Endpoints['GET /repos/{owner}/{repo}/releases/latest']['response'];
// type GitHubReleaseAsset = GitHubRelease['data']['assets'];

// export type GitHubReleaseAsset =
//     Endpoints['GET
//     /repos/{owner}/{repo}/releases/latest']['response']['data']['assets'];
// type GitHubRelease = Endpoints['GET
// /repos/:owner/:repo/releases/tags/:tag']['response'];

// (https?:|www\.)?github\.com\/([a-z]+)\/([a-z]+)\/.*
export interface GitHubRepositoryName {
  repo: string;
  owner: string;
}

export interface Asset {
  tag: string;
  name: string;
  url: string;
  download_url: string;
}

export function parseGithubRepo(repo: string): GitHubRepositoryName {
  const match = repo.match(/(?:github\.com\/)?([a-z]+)\/([a-z-_]+)(?:\/.*)?/);
  if (!match)
    throw new Error(`failed to parse github repository ${repo}`);
  return { owner: match[1], repo: match[2] }
}

const BINARY_NAME = process.platform === "win32" ? "tool.exe" : "tool";
const ACTION_NAME: string = process.env.GITHUB_ACTION_REPOSITORY ?? "";
const TEMP: string = process.env.RUNNER_TEMP ?? "";

// export enum ArchiveType {
//   Auto,
//   Tar,
//   7Zip,
//   Xir
// }

export class Release {
  public release: GitHubRelease;

  constructor(release: GitHubRelease) { this.release = release; }

  name(): string { return this.release.data.tag_name; }

  assets(): Asset[] {
    return this.release.data.assets.map((asset) => {
      return {
        tag : this.release.data.tag_name,
        name : asset.name,
        url : asset.url,
        download_url : asset.browser_download_url,
      };
    });
  }

  async download(asset: Asset,
                 {unarchive}: {unarchive?: boolean} = {}): Promise<string> {
    const ext = path.extname(asset.name);
    const downloaded = await tc.downloadTool(asset.download_url);

    if (unarchive ?? true) {
      switch (ext) {
      case ".pkg":
        return await tc.extractXar(downloaded, TEMP);
      case ".zip":
        return await tc.extractZip(downloaded, TEMP);
      case ".tar":
      case ".gz":
        return await tc.extractTar(downloaded, TEMP);
      case ".7z":
        return await tc.extractTar(downloaded, TEMP);
      default:
      };
    }
    return downloaded;
  }

  async downloadAsset(name: string,
                      {cache}: {cache?: boolean} = {}): Promise<string> {
    const useCache = cache ?? true;
    let asset = this.assets().find((asset) => asset.name === name);
    if (!asset)
      throw new Error(`release ${this.name()} has no asset ${
          name}. Available assets are: ${this.assets()}`);

    console.log(asset);
    console.log(this.name());
    console.log(ACTION_NAME);

    let downloaded: string|undefined = undefined;
    if (useCache) {
      downloaded = tc.find(ACTION_NAME, this.name());
    }
    if (!downloaded) {
      downloaded = await this.download(asset);
      if (useCache) {
        // 'path/to/exe', 'destFileName.exe', 'myExeName', '1.1.0'
        // this is hard to check without actual github actions
        downloaded = await tc.cacheFile(downloaded, BINARY_NAME, ACTION_NAME,
                                        this.name());
      }
    }
    return path.join(downloaded, BINARY_NAME);
  }
}

export class Repo {
  private api: Octokit;
  public repo: GitHubRepositoryName;
  // release: GitHubRelease;

  // latest, tag should be constructors that return a release?
  // we can then access the assets() -> Asset[]
  // we can then write assetForArch(arch) arch url? ...
  // we can then write download({ unarchive: true }): path
  // we can then write unarchive()

  constructor({repo, token}: {repo?: string, token?: string} = {}) {
    repo = repo ?? process.env.GITHUB_REPOSITORY;
    if (!repo) {
      throw new Error("missing repository");
    }

    this.repo = parseGithubRepo(repo);
    this.api = new Octokit({auth : token ?? process.env.GITHUB_TOKEN });
  }

  // constructor({token}: {token?: string} = {}) {
  //   this.api = new Octokit({auth : token ?? process.env.GITHUB_TOKEN });
  // }

  // assets(): GitHubReleaseAssets { return this.release.assets }

  // static async tag({owner, repo}: {owner: string, repo: string}):
  // <Release> {
  // }

  // static async latest({owner, repo}: {owner?: string, repo?: string}):
  // Promise<Release> {
  // static async latest({repo, token}: {repo?: string, token?: string} = {}):
  async getReleaseByTag(tag: string): Promise<Release> {
    const release = await this.api.request(
        'GET /repos/{owner}/{repo}/releases/tags/{tag}', {tag, ...this.repo});
    return new Release(release);
  }

  async getLatestRelease(): Promise<Release> {
    // Promise<Release> {
    //
    // const repository: string | undefined =
    //     (repo !== undefined) ? repo : process.env.GITHUB_REPOSITORY;

    // repo = (repo !== undefined) ? repo : process.env.GITHUB_REPOSITORY;
    // if (repo === undefined || repo === "") {
    //   // either set repo or the GITHUB_REPOSITORY environment variable
    //
    // const repository = (repo !== undefined) ? `${owner}/${repo}` : p
    // }
    // {owner}/{repo}
    // {owner, repo}
    // console.log(`GET /repos/${repo}/releases/latest`);
    console.log(this.repo);
    const release = await this.api.request(
        'GET /repos/{owner}/{repo}/releases/latest', {...this.repo});
    return new Release(release);
    // 404 if the repo does not have a release
    // otherwise we got the release :))
    // console.log(`GET /repos/${repo}/releases/latest`);
    //
    // console.log(release);
    // console.log(release["data"]["assets"]);
    // const release = await api.request(
    //     'GET /repos/{owner}/{repo}/releases/latest', {...repository});

    // let assets = release.assets_url;
    // {
    //   "url": "https://api.github.com/repos/octocat/Hello-World/releases/1",
    //   "html_url": "https://github.com/octocat/Hello-World/releases/v1.0.0",
    //   "assets_url":
    //   "https://api.github.com/repos/octocat/Hello-World/releases/1/assets",
    //   "upload_url":
    //   "https://uploads.github.com/repos/octocat/Hello-World/releases/1/assets{?name,label}",
    //   "tarball_url":
    //   "https://api.github.com/repos/octocat/Hello-World/tarball/v1.0.0",
    //   "zipball_url":
    //   "https://api.github.com/repos/octocat/Hello-World/zipball/v1.0.0",
    //   "discussion_url":
    //   "https://github.com/octocat/Hello-World/discussions/90", "id": 1,
    //   "node_id": "MDc6UmVsZWFzZTE=",
    //   "tag_name": "v1.0.0",
    //   "target_commitish": "master",
    //   "name": "v1.0.0",
    //   "body": "Description of the release",
    //   "draft": false,
    //   "prerelease": false,
    //   "created_at": "2013-02-27T19:35:32Z",
    //   "published_at": "2013-02-27T19:35:32Z",
    //   "author": {
    //     "login": "octocat",
    //     "id": 1,
    //     "node_id": "MDQ6VXNlcjE=",
    //     "avatar_url": "https://github.com/images/error/octocat_happy.gif",
    //     "gravatar_id": "",
    //     "url": "https://api.github.com/users/octocat",
    //     "html_url": "https://github.com/octocat",
    //     "followers_url": "https://api.github.com/users/octocat/followers",
    //     "following_url":
    //     "https://api.github.com/users/octocat/following{/other_user}",
    //     "gists_url":
    //     "https://api.github.com/users/octocat/gists{/gist_id}",
    //     "starred_url":
    //     "https://api.github.com/users/octocat/starred{/owner}{/repo}",
    //     "subscriptions_url":
    //     "https://api.github.com/users/octocat/subscriptions",
    //     "organizations_url": "https://api.github.com/users/octocat/orgs",
    //     "repos_url": "https://api.github.com/users/octocat/repos",
    //     "events_url":
    //     "https://api.github.com/users/octocat/events{/privacy}",
    //     "received_events_url":
    //     "https://api.github.com/users/octocat/received_events", "type":
    //     "User", "site_admin": false
    //   },
    //   "assets": [
    //     {
    //       "url":
    //       "https://api.github.com/repos/octocat/Hello-World/releases/assets/1",
    //       "browser_download_url":
    //       "https://github.com/octocat/Hello-World/releases/download/v1.0.0/example.zip",
    //       "id": 1,
    //       "node_id": "MDEyOlJlbGVhc2VBc3NldDE=",
    //       "name": "example.zip",
    //       "label": "short description",
    //       "state": "uploaded",
    //       "content_type": "application/zip",
    //       "size": 1024,
    //       "download_count": 42,
    //       "created_at": "2013-02-27T19:35:32Z",
    //       "updated_at": "2013-02-27T19:35:32Z",
    //       "uploader": {
    //         "login": "octocat",
    //         "id": 1,
    //         "node_id": "MDQ6VXNlcjE=",
    //         "avatar_url":
    //         "https://github.com/images/error/octocat_happy.gif",
    //         "gravatar_id": "",
    //         "url": "https://api.github.com/users/octocat",
    //         "html_url": "https://github.com/octocat",
    //         "followers_url":
    //         "https://api.github.com/users/octocat/followers",
    //         "following_url":
    //         "https://api.github.com/users/octocat/following{/other_user}",
    //         "gists_url":
    //         "https://api.github.com/users/octocat/gists{/gist_id}",
    //         "starred_url":
    //         "https://api.github.com/users/octocat/starred{/owner}{/repo}",
    //         "subscriptions_url":
    //         "https://api.github.com/users/octocat/subscriptions",
    //         "organizations_url":
    //         "https://api.github.com/users/octocat/orgs", "repos_url":
    //         "https://api.github.com/users/octocat/repos", "events_url":
    //         "https://api.github.com/users/octocat/events{/privacy}",
    //         "received_events_url":
    //         "https://api.github.com/users/octocat/received_events", "type":
    //         "User", "site_admin": false
    //       }
    //     }
    //   ]
    // }
  }
}

// // list releases
// await octokit
//     .request('GET /repos/{owner}/{repo}/releases{?per_page,page}',
//              {owner : 'OWNER', repo : 'REPO'})

// // get release by tag
// await octokit.request('GET /repos/{owner}/{repo}/releases/tags/{tag}',
//                       {owner : 'OWNER', repo : 'REPO', tag : 'TAG'})

// {
//   "url": "https://api.github.com/repos/octocat/Hello-World/releases/1",
//   "html_url": "https://github.com/octocat/Hello-World/releases/v1.0.0",
//   "assets_url":
//   "https://api.github.com/repos/octocat/Hello-World/releases/1/assets",
//   "upload_url":
//   "https://uploads.github.com/repos/octocat/Hello-World/releases/1/assets{?name,label}",
//   "tarball_url":
//   "https://api.github.com/repos/octocat/Hello-World/tarball/v1.0.0",
//   "zipball_url":
//   "https://api.github.com/repos/octocat/Hello-World/zipball/v1.0.0",
//   "discussion_url":
//   "https://github.com/octocat/Hello-World/discussions/90", "id": 1,
//   "node_id": "MDc6UmVsZWFzZTE=",
//   "tag_name": "v1.0.0",
//   "target_commitish": "master",
//   "name": "v1.0.0",
//   "body": "Description of the release",
//   "draft": false,
//   "prerelease": false,
//   "created_at": "2013-02-27T19:35:32Z",
//   "published_at": "2013-02-27T19:35:32Z",
//   "author": {
//     "login": "octocat",
//     "id": 1,
//     "node_id": "MDQ6VXNlcjE=",
//     "avatar_url": "https://github.com/images/error/octocat_happy.gif",
//     "gravatar_id": "",
//     "url": "https://api.github.com/users/octocat",
//     "html_url": "https://github.com/octocat",
//     "followers_url": "https://api.github.com/users/octocat/followers",
//     "following_url":
//     "https://api.github.com/users/octocat/following{/other_user}",
//     "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
//     "starred_url":
//     "https://api.github.com/users/octocat/starred{/owner}{/repo}",
//     "subscriptions_url":
//     "https://api.github.com/users/octocat/subscriptions",
//     "organizations_url": "https://api.github.com/users/octocat/orgs",
//     "repos_url": "https://api.github.com/users/octocat/repos",
//     "events_url": "https://api.github.com/users/octocat/events{/privacy}",
//     "received_events_url":
//     "https://api.github.com/users/octocat/received_events", "type": "User",
//     "site_admin": false
//   },
//   "assets": [
//     {
//       "url":
//       "https://api.github.com/repos/octocat/Hello-World/releases/assets/1",
//       "browser_download_url":
//       "https://github.com/octocat/Hello-World/releases/download/v1.0.0/example.zip",
//       "id": 1,
//       "node_id": "MDEyOlJlbGVhc2VBc3NldDE=",
//       "name": "example.zip",
//       "label": "short description",
//       "state": "uploaded",
//       "content_type": "application/zip",
//       "size": 1024,
//       "download_count": 42,
//       "created_at": "2013-02-27T19:35:32Z",
//       "updated_at": "2013-02-27T19:35:32Z",
//       "uploader": {
//         "login": "octocat",
//         "id": 1,
//         "node_id": "MDQ6VXNlcjE=",
//         "avatar_url": "https://github.com/images/error/octocat_happy.gif",
//         "gravatar_id": "",
//         "url": "https://api.github.com/users/octocat",
//         "html_url": "https://github.com/octocat",
//         "followers_url": "https://api.github.com/users/octocat/followers",
//         "following_url":
//         "https://api.github.com/users/octocat/following{/other_user}",
//         "gists_url":
//         "https://api.github.com/users/octocat/gists{/gist_id}",
//         "starred_url":
//         "https://api.github.com/users/octocat/starred{/owner}{/repo}",
//         "subscriptions_url":
//         "https://api.github.com/users/octocat/subscriptions",
//         "organizations_url": "https://api.github.com/users/octocat/orgs",
//         "repos_url": "https://api.github.com/users/octocat/repos",
//         "events_url":
//         "https://api.github.com/users/octocat/events{/privacy}",
//         "received_events_url":
//         "https://api.github.com/users/octocat/received_events", "type":
//         "User", "site_admin": false
//       }
//     }
//   ]
// }

// export {sayHello, sayGoodbye} from './hello-world'
//
// export async function download(
//     // version: SemVer,
//     // method: Method,
//     cache: boolean): Promise<string> {}

// async function run(): Promise<void> {
//     try {
// run()

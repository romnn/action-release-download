import * as core from "@actions/core";
import { Release, Repo } from "./src/index.js";
import * as util from "node:util";
// import * as path from "path";

// async function getVersion(): Promise<string> {
//   let version = "latest";
//   const manifest = await parseCargoPackageManifestAsync(
//     path.join(__dirname, "../Cargo.toml"),
//   );
//   const manifestVersion = manifest.package?.version;
//   if (manifestVersion && manifestVersion !== "") {
//     version = `v${manifestVersion}`;
//   }
//   const versionOverride = core.getInput("version");
//   if (versionOverride && versionOverride !== "") {
//     version = versionOverride;
//   }
//   return version;
// }

async function download(release: Release, asset: string) {
  let downloaded: string;
  try {
    downloaded = await release.downloadAsset(asset, { cache: false });
  } catch (err: unknown) {
    throw new Error(`failed to download asset ${asset}: ${err}`);
  }

  core.addPath(downloaded);
}

// function trimPrefix(toTrim: string, trim: string): string {
//   if (!toTrim || !trim) {
//     return toTrim;
//   }
//   const index = toTrim.indexOf(trim);
//   if (index !== 0) {
//     return toTrim;
//   }
//   return toTrim.substring(trim.length);
// }

async function run(): Promise<void> {
  const config = {
    repo: core.getInput("repo"),
    assets: core.getInput("assets"),
    token: core.getInput("token"),
    version: core.getInput("version"),
    githubApiUrl: core.getInput("github-api-url"),
  } as const;
  console.log(util.inspect(config));

  const repo = new Repo({ repo: config.repo, token: config.token });

  // const version = await getVersion();
  core.debug(`repo=${repo.fullName()}`);
  core.debug(`version=${config.version}`);

  for (const asset of config.assets) {
    core.debug(`asset=${asset}`);
  }

  // let release: Release;
  // try {
  //   release =
  //     version === "" || version === "latest"
  //       ? await repo.getLatestRelease()
  //       : await repo.getReleaseByTag(version);
  // } catch (err: unknown) {
  //   throw new Error(
  //     `failed to fetch ${version} release for ${repo.fullName()}: ${err}`,
  //   );
  // }
  // core.debug(
  //   `found ${release.assets().length
  //   } assets for ${version} release of ${repo.fullName()}`,
  // );
  //
  // let platform: "windows" | "darwin" | "linux";
  // if (process.platform === "linux") {
  //   platform = "linux";
  // } else if (process.platform === "darwin") {
  //   platform = "darwin";
  // } else if (process.platform === "win32") {
  //   platform = "windows";
  // } else {
  //   throw new Error(`platform ${process.platform} is not supported`);
  // }
  //
  // let arch: "arm64" | "amd64";
  // if (process.arch === "arm64") {
  //   arch = "arm64";
  // } else if (process.arch === "x64") {
  //   arch = "amd64";
  // } else {
  //   throw new Error(`arch ${process.arch} is not supported`);
  // }
  //
  // const extension = platform === "windows" ? "zip" : "tar.gz";
  //
  // await Promise.all([
  //   // cargo-fc_0.0.30_linux_amd64.tar.gz
  //   download(
  //     release,
  //     `cargo-fc_${trimPrefix(version, "v")}_${platform}_${arch}.${extension}`,
  //   ),
  //   // cargo-feature-combinations_0.0.30_linux_amd64.tar.gz
  //   download(
  //     release,
  //     `cargo-feature-combinations_${trimPrefix(version, "v")}_${platform}_${arch}.${extension}`,
  //   ),
  // ]);
}

run().catch((error) => core.setFailed(error.message));

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import {Repo, RustTarget} from "action-release-download";
import * as path from 'path';

async function run(): Promise<void> {
  // const version: string | undefined = "v0.0.1";
  const version: string = "v0.0.1";

  // const token: string = process.env.GITHUB_TOKEN ?? "";
  // console.log(token)
  // const releass = new Releases(); // {token});
  // const assets: Asset[] = (version === "") ? await releases.latest()
  //                                          : await releases.tagged(version);

  // const releass = new Releases(); // {token});
  const repo = new Repo({repo : "romnn/publish-crates"});
  const release = (version === "" || version === "latest")
                      ? await repo.getLatestRelease()
                      : await repo.getReleaseByTag(version);
  // console.log(release);
  // const assets = release.assets();
  // console.log(assets);
  core.debug(`found ${release.assets().length} assets for ${
      version} release of ${repo.fullName()}`);

  const {platform, arch} = new RustTarget();
  core.debug(`host system: platform=${platform} arch=${arch}`);
  // `architecture  ${release.assets().length} assets for ${

  // ldap-manager-linux-amd64
  // const asset = `ldap-manager-${platform}-amd64`;

  // publish-crates-action-x86_64-unknown-linux-gnu.tar.gz
  const asset = `publish-crates-action-${arch}-unknown-${platform}-gnu.tar.gz`;
  // core.debug(`downloading ass{platform, arch});
  //
  const downloaded = await release.downloadAsset(asset, {cache : false});
  // core.addPath(downloaded);
  // console.log(downloaded);
  const executable = path.join(downloaded, "publish-crates-action");
  // console.log(executable);

  await exec.exec(executable);
}

run(); // .catch((error) => core.setFailed(error.message));

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import {Repo, RustTarget} from "action-get-release";
import * as path from 'path';

async function run(): Promise<void> {
  const version: string = "v0.0.1";
  const dest = path.resolve(__dirname, 'tmp');

  const repo = new Repo({repo : "romnn/publish-crates"});
  const release = (version === "" || version === "latest")
                      ? await repo.getLatestRelease()
                      : await repo.getReleaseByTag(version);
  core.debug(`found ${release.assets().length} assets for ${
      version} release of ${repo.fullName()}`);

  const {platform, arch} = new RustTarget();
  core.debug(`host system: platform=${platform} arch=${arch}`);

  // publish-crates-action-x86_64-unknown-linux-gnu.tar.gz
  const asset = `publish-crates-action-${arch}-unknown-${platform}-gnu.tar.gz`;
  const downloaded = await release.downloadAsset(
      asset, {cache : false, cacheToolKey : "publish-crates", dest});
  // core.addPath(downloaded);
  const executable = path.join(downloaded, "publish-crates-action");
  await exec.exec(executable);
}

run().catch((error) => core.setFailed(error.message));

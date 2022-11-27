import * as core from "@actions/core";
import * as exec from "@actions/exec";
import {Repo, RustTarget} from "action-release-download";

// const { GITHUB_REPOSITORYRUNNER_TEMP } = process.env;

async function run(): Promise<void> {
  const version: string = "";
  // const repo = {owner : "romnn", repo : "ldap-manager"};

  // const token: string = process.env.GITHUB_TOKEN ?? "";
  // console.log(token)
  // const releass = new Releases(); // {token});
  // const assets: Asset[] = (version === "") ? await releases.latest()
  //                                          : await releases.tagged(version);

  // const releass = new Releases(); // {token});
  const repo = new Repo();
  const release = (version === "") ? await repo.getLatestRelease()
                                   : await repo.getReleaseByTag(version);
  console.log(release);

  const assets = release.assets();
  console.log(assets);

  const {platform, arch} = new RustTarget();
  console.log(platform, arch);

  // ldap-manager-linux-amd64
  const asset = `ldap-manager-${platform}-amd64`;
  const executable = await release.downloadAsset(asset, {cache : false});
  console.log(executable);

  await exec.exec(executable); // , [COMMAND]);
}

run(); // .catch((error) => core.setFailed(error.message));

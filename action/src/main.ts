import * as core from "@actions/core";
import { Release, Repo } from "action-get-release";
import { getPlatform, getArchitecture } from "action-get-release/platform";
import { parseAssets, templateAsset, TemplateContext } from "./assets.js";
import { minimatch } from "minimatch";

async function download(release: Release, asset: string) {
  let downloaded: string;
  try {
    downloaded = await release.downloadAsset(asset, { cache: false });
  } catch (err: unknown) {
    throw new Error(`failed to download asset ${asset}: ${err}`);
  }

  core.addPath(downloaded);
}

async function downloadAsset({
  repo,
  assetTemplate,
  version,
}: {
  repo: Repo;
  assetTemplate: string;
  version: string;
}): Promise<void> {
  let release: Release;
  try {
    release =
      version === "" || version === "latest"
        ? await repo.getLatestRelease()
        : await repo.getReleaseByTag(version);
  } catch (err: unknown) {
    throw new Error(
      `failed to fetch ${version} release for ${repo.fullName()}: ${err}`,
    );
  }

  const availableAssetList = release
    .assets()
    .map((asset) => ` - ${asset.name()}`)
    .join("\n");

  core.info(
    `found ${
      release.assets().length
    } assets for ${version} release of ${repo.fullName()}`,
  );
  core.debug(
    `found ${
      release.assets().length
    } assets for ${version} release of ${repo.fullName()}:\n${availableAssetList}`,
  );

  // template the asset name
  const context: TemplateContext = {
    release: {
      tag: release.tag().trim(),
      id: release.id().trim(),
    },
    repo: {
      owner: repo.owner().trim(),
      name: repo.name().trim(),
      fullName: repo.fullName().trim(),
    },
    arch: getArchitecture(),
    platform: getPlatform(),
  };

  core.info(`asset[template]=${assetTemplate}`);

  const assetPattern = templateAsset(assetTemplate, context);
  core.info(`asset[pattern]=${assetPattern}`);

  const assets = release
    .assets()
    .filter((asset) => minimatch(assetPattern, asset.name()));
  for (const asset of assets) {
    core.info(`asset[match]=${asset.name()}`);
  }

  const errorContext = `
Template:
${assetTemplate}

Pattern:
${assetPattern}

Available assets in release ${context.release.tag} (${context.release.id}):
${availableAssetList}
`;

  if (assets.length < 1) {
    core.error(`did not match any release asset.\n${errorContext}`);
    return;
    // throw new Error(`did not match any release asset.\n${errorContext}`);
  }

  if (assets.length > 1) {
    core.warning(`matched more than one release asset.\n${errorContext}`);
  }

  await Promise.all(assets.map((asset) => download(release, asset.name())));
}

async function run(): Promise<void> {
  const config = {
    repo: core.getInput("repo"),
    assets: core.getInput("assets"),
    token: core.getInput("token"),
    version: core.getInput("version"),
    githubApiUrl: core.getInput("github-api-url"),
  } as const;

  const repo = new Repo({ repo: config.repo, token: config.token });

  core.info(`repo = ${repo.fullName()}`);
  core.info(`version = ${config.version}`);

  const assets = parseAssets(config.assets);
  await Promise.all([
    assets.map((asset) =>
      downloadAsset({ assetTemplate: asset, repo, version: config.version }),
    ),
  ]);
}

run().catch((error) => {
  console.log(error);
  core.setFailed(error.message);
});

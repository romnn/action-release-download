import * as core from "@actions/core";
import { Asset, Release, Repo } from "action-get-release";
import { getPlatform, getArchitecture } from "action-get-release/platform";
import {
  matchAssets,
  parseAssets,
  templateAsset,
  TemplateContext,
} from "./assets.js";

async function download(release: Release, asset: string) {
  let downloaded: string;
  try {
    downloaded = await release.downloadAsset(asset, { cache: false });
  } catch (err: unknown) {
    throw new Error(`failed to download asset ${asset}: ${err}`);
  }

  core.addPath(downloaded);
}

function list(assets: Asset[]): string {
  return assets.map((asset) => ` - ${asset.name()}`).join("\n");
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

  const availableAssetList = list(release.assets());
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

  core.debug(`asset[template]=${assetTemplate}`);

  const assetPattern = templateAsset(assetTemplate, context);
  core.debug(`asset[pattern]=${assetPattern}`);

  const assets = matchAssets(release.assets(), assetPattern);
  for (const asset of assets) {
    core.debug(`asset[match]=${asset.name()}`);
  }

  const matchingAssetList = list(assets);
  const errorContext = `
Template:
${assetTemplate}

Pattern:
${assetPattern}

Available assets in release ${context.release.tag} (${context.release.id}):
${availableAssetList}

Matching assets in release ${context.release.tag} (${context.release.id}):
${matchingAssetList}
`;

  if (assets.length < 1) {
    core.error(`did not match any release asset.\n${errorContext}`);
    throw new Error(`did not match any release asset`);
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

  core.debug(`repo = ${repo.fullName()}`);
  core.debug(`version = ${config.version}`);

  const assets = parseAssets(config.assets);
  await Promise.all([
    assets.map((asset) =>
      downloadAsset({ assetTemplate: asset, repo, version: config.version }),
    ),
  ]);
}

run().catch((error) => {
  console.error(error);
  core.setFailed(error.message);
});

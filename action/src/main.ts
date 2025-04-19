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

function bulletPointList(assets: Asset[]): string {
  return assets.map((asset) => ` - ${asset.name()}`).join("\n");
}

function resolveAssets({
  repo,
  release,
  assetTemplate,
}: {
  repo: Repo;
  release: Release;
  assetTemplate: string;
}): { matched: Asset[]; pattern: string } {
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

  return { matched: assets, pattern: assetPattern };
}

async function run(): Promise<void> {
  const config = {
    repo: core.getInput("repo"),
    assets: core.getInput("assets"),
    token: core.getInput("token"),
    version: core.getInput("version"),
    githubApiUrl: core.getInput("github-api-url"),
    expectedMatchingAssetCount: parseInt(
      core.getInput("expected-matching-asset-count"),
    ),
  } as const;

  const repo = new Repo({ repo: config.repo, token: config.token });

  core.debug(`repo = ${repo.fullName()}`);
  core.debug(`version = ${config.version}`);

  let release: Release;
  try {
    release =
      config.version === "" || config.version === "latest"
        ? await repo.getLatestRelease()
        : await repo.getReleaseByTag(config.version);
  } catch (err: unknown) {
    throw new Error(
      `failed to fetch ${config.version} release for ${repo.fullName()}: ${err}`,
    );
  }

  const assets = release.assets();

  core.info(`
Found ${assets.length} assets in release ${release.tag} (${release.id}):
${bulletPointList(assets)}
    `);

  const assetTemplates = parseAssets(config.assets);
  const resolvedAssets = assetTemplates.flatMap((assetTemplate) => {
    const { matched, pattern } = resolveAssets({
      assetTemplate,
      repo,
      release,
    });
    if (config.expectedMatchingAssetCount > 0 && matched.length < 1) {
      core.warning(`${pattern} did not match any release asset
Template:
${assetTemplate}

Pattern:
${pattern}
  `);
    }
    return matched;
  });

  const uniqueAssets = resolvedAssets.filter(
    (value, index, self) =>
      index === self.findIndex((t) => t.downloadUrl === value.downloadUrl),
  );

  if (config.expectedMatchingAssetCount > 0 && uniqueAssets.length < 1) {
    throw new Error(`did not match any release asset`);
  }

  if (config.expectedMatchingAssetCount != uniqueAssets.length) {
    core.warning(
      `expected to match ${config.expectedMatchingAssetCount} release assets, but matched ${uniqueAssets.length}:

Matching assets in release ${release.tag} (${release.id}):
${bulletPointList(uniqueAssets)}
`,
    );
  }

  await Promise.all(
    uniqueAssets.map((asset) => download(release, asset.name())),
  );
}

async function main() {
  try {
    await run();
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.error(`${error}`);
      core.setFailed("");
    }
  }
}

main();

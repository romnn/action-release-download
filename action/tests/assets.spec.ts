import { describe, expect, it } from "vitest";
import {
  matchAssets,
  parseAssets,
  templateAsset,
} from "action-get-release-action/assets";

describe("assets", () => {
  it("can be plain strings", async () => {
    expect(parseAssets("  some-user-value_0.23.zip")).toEqual([
      "some-user-value_0.23.zip",
    ]);
  });
  it("can be stringified YAML sequences", async () => {
    expect(
      parseAssets(`
 - some-user-value_0.23-windows.zip
 - some-user-value_0.23-linux.zip
 - some-user-value_0.23-darwin.zip
  `),
    ).toEqual([
      "some-user-value_0.23-windows.zip",
      "some-user-value_0.23-linux.zip",
      "some-user-value_0.23-darwin.zip",
    ]);
  });
});

describe("assets", () => {
  const context = {
    release: {
      tag: "v12.3",
      id: "xyz",
    },
    repo: {
      owner: "romnn",
      name: "test-repo",
      fullName: "romnn/test-repo",
    },
  } as const;
  it("can be templated using switch expressions", async () => {
    const template = `
cargo-fc_{{~ stripPrefix (trim release.tag) "v" ~}}_
{{~#switch platform ~}}
  {{~#case "win32"~}}windows{{~/case~}}
  {{~#default~}}{{~platform~}}{{~/default~}}
{{~/switch~}}
_
{{~#switch arch ~}}
  {{~#case "x64"~}}amd64{{~/case~}}
  {{~#default~}}{{~arch~}}{{~/default~}}
{{~/switch~}}
{{~#switch platform~}}
  {{~#case "win32"~}}.zip{{~/case~}}
  {{~#default~}}.tar.gz{{~/default~}}
{{~/switch~}}
    `;
    expect(
      templateAsset(template, { ...context, platform: "win32", arch: "x64" }),
    ).toEqual("cargo-fc_12.3_windows_amd64.zip");
    expect(
      templateAsset(template, { ...context, platform: "win32", arch: "arm64" }),
    ).toEqual("cargo-fc_12.3_windows_arm64.zip");
    expect(
      templateAsset(template, {
        ...context,
        platform: "darwin",
        arch: "arm64",
      }),
    ).toEqual("cargo-fc_12.3_darwin_arm64.tar.gz");
    expect(
      templateAsset(template, { ...context, platform: "darwin", arch: "x64" }),
    ).toEqual("cargo-fc_12.3_darwin_amd64.tar.gz");
    expect(
      templateAsset(template, { ...context, platform: "linux", arch: "x64" }),
    ).toEqual("cargo-fc_12.3_linux_amd64.tar.gz");
    expect(
      templateAsset(template, { ...context, platform: "linux", arch: "arm64" }),
    ).toEqual("cargo-fc_12.3_linux_arm64.tar.gz");
  });

  it("can be templated using switch expressions and wildcards", async () => {
    const rawAssets = `
- >-
  cargo-*
  {{~#switch platform ~}}
    {{~#case "win32"~}}windows{{~/case~}}
    {{~#default~}}{{~platform~}}{{~/default~}}
  {{~/switch~}}
  _
  {{~#switch arch ~}}
  {{~#case "x64"~}}amd64{{~/case~}}
  {{~#default~}}{{~arch~}}{{~/default~}}
  {{~/switch~}}
    `;
    const assetTemplates = parseAssets(rawAssets);

    expect(assetTemplates).toHaveLength(1);
    const template = assetTemplates[0];

    expect(
      templateAsset(template, { ...context, platform: "win32", arch: "x64" }),
    ).toEqual("cargo-*windows_amd64");
  });
});

class MockAsset {
  _name: string;

  constructor(name: string) {
    this._name = name;
  }

  name(): string {
    return this._name;
  }
}

describe("assets", () => {
  const assets = [
    "cargo-fc_0.0.38_darwin_amd64.tar.gz",
    "cargo-fc_0.0.38_darwin_arm64.tar.gz",
    "cargo-fc_0.0.38_linux_amd64.tar.gz",
    "cargo-fc_0.0.38_linux_arm64.tar.gz",
    "cargo-fc_0.0.38_windows_amd64.zip",
    "cargo-feature-combinations_0.0.38_darwin_amd64.tar.gz",
    "cargo-feature-combinations_0.0.38_darwin_arm64.tar.gz",
    "cargo-feature-combinations_0.0.38_linux_amd64.tar.gz",
    "cargo-feature-combinations_0.0.38_linux_arm64.tar.gz",
    "cargo-feature-combinations_0.0.38_windows_amd64.zip",
    "checksums.txt",
  ].map((asset) => new MockAsset(asset));

  it("are matched using wildcards", async () => {
    expect(matchAssets(assets, "*cargo-*linux_amd64*")).toEqual([
      new MockAsset("cargo-fc_0.0.38_linux_amd64.tar.gz"),
      new MockAsset("cargo-feature-combinations_0.0.38_linux_amd64.tar.gz"),
    ]);
  });

  //
  it("are not matched when not a full match", async () => {
    expect(matchAssets(assets, "cargo-*linux_amd64")).toEqual([]);
  });
});

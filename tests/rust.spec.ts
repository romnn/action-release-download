import {promises as fs} from "fs";
import path from "path";
import tmp from "tmp";

import {
  parseCargoPackageManifestAsync,
  parseCargoPackageManifestSync
} from "../src/rust";

describe("rust", () => {
  let tmpDir: tmp.DirResult;

  beforeEach(() => { tmpDir = tmp.dirSync({unsafeCleanup : true}); });
  afterEach(() => tmpDir.removeCallback());

  it("parses a cargo manifest", async () => {
    const manifestPath = path.join(tmpDir.name, "Cargo.toml");
    const manifestContent = `
[package]
name = "filmborders"
version = "0.0.32"
authors = ["romnn <contact@romnn.com>"]
edition = "2021"
description = "add hipster film borders to your images :)"
license-file = "LICENSE"
readme = "README.md"
homepage = "https://film-borders.romnn.com"
repository = "https://github.com/romnn/film-borders"
       `;
    await fs.writeFile(manifestPath, manifestContent, {
      flag : "w",
    });
    const manifests = [
      parseCargoPackageManifestSync(manifestPath),
      await parseCargoPackageManifestAsync(manifestPath)
    ];
    for (const manifest of manifests) {
      const {name, repository, version} = manifest.package;

      expect({
        name,
        repository,
        version,
      }).toEqual({
        name : "filmborders",
        repository : "https://github.com/romnn/film-borders",
        version : "0.0.32",
      });
    }
  });
});

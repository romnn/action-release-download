import fs, {promises as asyncfs} from "fs";
import * as toml from "toml";

import {Architecture, Platform} from "../index";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseCargoPackageManifestSync(path: string): any {
  const content = fs.readFileSync(path, "binary");
  return toml.parse(content.toString());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseCargoPackageManifestAsync(path: string): Promise<any> {
  const content = await asyncfs.readFile(path, "binary");
  return toml.parse(content.toString());
}

export class RustTarget {
  public platform: string;
  public arch: string;

  constructor({
    platform,
    arch,
  }: {platform?: Platform; arch?: Architecture} = {}) {
    const rustPlatform = toRustPlatform(platform ?? process.platform);
    if (!rustPlatform)
      throw new Error(
          `failed to map node platform ${platform} to rust platform`);
    this.platform = rustPlatform;
    const rustArch = toRustArch(arch ?? process.arch);
    if (!rustArch)
      throw new Error(`failed to map node arch ${arch} to rust arch`);
    this.arch = rustArch;
  }
}

export function toRustPlatform(platform: Platform): string|undefined {
  // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node/process.d.ts
  switch (platform) {
  case "linux":
    return "linux";
  case "darwin":
    return "apple-darwin";
  case "win32":
    return "pc-windows";
  case "freebsd":
    return "freebsd";
  case "netbsd":
    return "netbsd";
  default:
    return undefined;
  }
}

export function toRustArch(arch: Architecture): string|undefined {
  // available rust toolchains: `rustup target list`
  // platform support:
  // https://doc.rust-lang.org/nightly/rustc/platform-support.html
  // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node/process.d.ts
  switch (arch) {
  case "arm":
    return "arm";
  case "arm64":
    return "aarch64";
  case "ia32":
    return undefined;
  case "mips":
    return "mips";
  case "mipsel":
    return "mipsel";
  case "ppc":
    return "powerpc";
  case "ppc64":
    return "powerpc64";
  case "s390":
    return undefined;
  case "s390x":
    return "s390x";
  case "x64":
    return "x86_64";
  }
}

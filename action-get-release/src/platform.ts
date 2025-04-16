export type Architecture = typeof process.arch;
export type Platform = typeof process.platform;

export function getArchitecture(): Architecture {
  return process.arch;
}

export function getPlatform(): Platform {
  return process.platform;
}

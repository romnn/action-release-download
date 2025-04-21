import * as fs from "fs/promises";
import * as path from "path";

export async function dirExists(path: string): Promise<boolean> {
  const stat = await fs.lstat(path);
  return stat.isDirectory();
}

export function stripExtension(filePath: string): string {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  return path.join(dir, base);
}

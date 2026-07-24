import * as fs from "fs/promises";
import * as path from "path";

export async function dirExists(path: string): Promise<boolean> {
  const stat = await fs.lstat(path);
  return stat.isDirectory();
}

export function stripExtension(filePath: string): string {
  // Only remove the extension; keep the path verbatim. Recomposing via
  // path.join/path.format would normalize separators (e.g. "/" -> "\" on
  // Windows), so slice it off the original string instead. path.extname
  // handles the edge cases (dotfiles, multi-dot names, no extension).
  const ext = path.extname(filePath);
  return filePath.slice(0, filePath.length - ext.length);
}

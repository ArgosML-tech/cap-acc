import path from 'path';
import { promises as fs } from 'fs';
import fsExtra from 'fs-extra';

export function toPascalCase(str: string): string {
  return str.replace(/(^\w|-\w)/g, (m) => m.replace('-', '').toUpperCase());
}

export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fsExtra.ensureDir(dirPath);
}

export async function writeFileSafe(
  filePath: string,
  content: string,
  onConflict: () => Promise<boolean>
): Promise<boolean> {
  if (await fileExists(filePath)) {
    const overwrite = await onConflict();
    if (!overwrite) return false;
  }
  await fsExtra.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
  return true;
}

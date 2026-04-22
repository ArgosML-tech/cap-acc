import ejs from 'ejs';
import path from 'path';
import { promises as fs } from 'fs';
import fsExtra from 'fs-extra';

export async function renderEjs(
  templatePath: string,
  variables: Record<string, unknown>
): Promise<string> {
  const content = await fs.readFile(templatePath, 'utf-8');
  return ejs.render(content, variables, { filename: templatePath });
}

export async function copyTemplate(
  srcDir: string,
  destDir: string,
  variables: Record<string, unknown>
): Promise<void> {
  await fsExtra.ensureDir(destDir);
  await copyDir(srcDir, destDir, variables);
}

async function copyDir(
  srcDir: string,
  destDir: string,
  variables: Record<string, unknown>
): Promise<void> {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, path.join(destDir, entry.name), variables);
    } else {
      const isEjs = entry.name.endsWith('.ejs');
      const destName = isEjs ? entry.name.slice(0, -4) : entry.name;
      const destPath = path.join(destDir, destName);

      await fsExtra.ensureDir(path.dirname(destPath));

      if (isEjs) {
        const rendered = await renderEjs(srcPath, variables);
        await fs.writeFile(destPath, rendered, 'utf-8');
      } else {
        await fsExtra.copy(srcPath, destPath);
      }
    }
  }
}

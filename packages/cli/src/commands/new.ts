import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import fsExtra from 'fs-extra';
import { copyTemplate } from '../utils/template';

const AVAILABLE_STARTERS = ['integration-service'];

function resolveStarterPath(starter: string): string {
  const pkg = `@argos/starter-${starter}`;
  try {
    return path.dirname(require.resolve(`${pkg}/package.json`));
  } catch {
    throw new Error(`Starter package ${pkg} not found. Run npm install at the workspace root first.`);
  }
}

// CDS compiler v6 treats these as reserved identifiers
const CDS_RESERVED = new Set(['test', 'new', 'type', 'select', 'from', 'where', 'order', 'group']);

function toNamespace(name: string): string {
  return name
    .replace(/-/g, '.')
    .toLowerCase()
    .split('.')
    .map((seg) => (CDS_RESERVED.has(seg) ? `${seg}_` : seg))
    .join('.');
}

export function newCommand(program: Command): void {
  program
    .command('new <starter> <name>')
    .description('Create a new CAP project from a starter template')
    .action(async (starter: string, name: string) => {
      if (!AVAILABLE_STARTERS.includes(starter)) {
        console.error(chalk.red(`Unknown starter: "${starter}". Available: ${AVAILABLE_STARTERS.join(', ')}`));
        process.exit(1);
      }

      const destDir = path.resolve(process.cwd(), name);

      if (await fsExtra.pathExists(destDir)) {
        console.error(chalk.red(`Directory "${name}" already exists.`));
        process.exit(1);
      }

      let starterRoot: string;
      try {
        starterRoot = resolveStarterPath(starter);
      } catch (err: unknown) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }

      const templateDir = path.join(starterRoot, 'template');
      const variables = {
        name,
        namespace: toNamespace(name),
        projectName: name,
      };

      console.log(chalk.blue(`\nCreating "${name}" from ${starter} starter...`));
      await copyTemplate(templateDir, destDir, variables);

      console.log(chalk.green(`\n✓ Project created at ./${name}`));
      console.log(chalk.gray(`\nNext steps:`));
      console.log(chalk.gray(`  cd ${name}`));
      console.log(chalk.gray(`  npm install`));
      console.log(chalk.gray(`  npm start\n`));
    });
}

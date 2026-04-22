import { Command } from 'commander';
import chalk from 'chalk';
import { draftEntityGenerator } from '../generators/draft-entity';
import { mockedAuthGenerator } from '../generators/mocked-auth';
import { actionTestsGenerator } from '../generators/action-tests';
import { auditTrailGenerator } from '../generators/audit-trail';
import { commentsGenerator } from '../generators/comments';

interface Generator {
  name: string;
  description: string;
  run(projectDir: string): Promise<void>;
}

const GENERATORS: Record<string, Generator> = {
  'draft-entity': draftEntityGenerator,
  'mocked-auth':  mockedAuthGenerator,
  'action-tests': actionTestsGenerator,
  'audit-trail':  auditTrailGenerator,
  'comments':     commentsGenerator,
};

export function addCommand(program: Command): void {
  program
    .command('add <generator>')
    .description('Add a generator artifact to an existing CAP project')
    .action(async (generatorName: string) => {
      const generator = GENERATORS[generatorName];

      if (!generator) {
        const available = Object.keys(GENERATORS).join(', ');
        console.error(chalk.red(`Unknown generator: "${generatorName}". Available: ${available}`));
        process.exit(1);
      }

      console.log(chalk.blue(`\nRunning generator: ${generator.name}\n`));

      try {
        await generator.run(process.cwd());
        console.log(chalk.green(`\n✓ Generator "${generatorName}" completed.\n`));
      } catch (err: unknown) {
        console.error(chalk.red(`\n✗ Generator failed: ${(err as Error).message}\n`));
        process.exit(1);
      }
    });
}

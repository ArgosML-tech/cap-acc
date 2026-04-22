import { Command } from 'commander';
import { newCommand } from './commands/new';
import { addCommand } from './commands/add';

const program = new Command();

program
  .name('capx')
  .description('CAP Development Accelerator CLI')
  .version('0.1.0');

newCommand(program);
addCommand(program);

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});

import path from 'path';
import chalk from 'chalk';
import fsExtra from 'fs-extra';
import { promptList, promptConfirm, log } from '../../utils/prompt';
import { writeFileSafe } from '../../utils/fs';
import { renderEjs } from '../../utils/template';

const TEMPLATES_DIR = path.join(__dirname, '../../../templates/generators/mocked-auth');

export const mockedAuthGenerator = {
  name: 'mocked-auth',
  description: 'Add mocked auth users to .cdsrc.json and generate test user constants',

  async run(projectDir: string): Promise<void> {
    const roles = await promptList('roles', 'Roles to create (comma-separated, e.g. admin,viewer,editor):');

    if (roles.length === 0) throw new Error('At least one role is required.');

    const vars = { roles };

    // Generate test/users.mock.js
    const tplPath  = path.join(TEMPLATES_DIR, 'users.mock.js.ejs');
    const destPath = path.join(projectDir, 'test/users.mock.js');
    const content  = await renderEjs(tplPath, vars as unknown as Record<string, unknown>);

    const written = await writeFileSafe(destPath, content, () =>
      promptConfirm('overwrite-users-mock', 'test/users.mock.js already exists. Overwrite?')
    );
    log(written ? chalk.green('created  test/users.mock.js') : chalk.yellow('skipped  test/users.mock.js'));

    // Merge into .cdsrc.json
    await updateCdsrc(projectDir, roles);
  },
};

async function updateCdsrc(projectDir: string, roles: string[]): Promise<void> {
  const cdsrcPath = path.join(projectDir, '.cdsrc.json');
  let config: Record<string, unknown> = {};

  if (await fsExtra.pathExists(cdsrcPath)) {
    config = await fsExtra.readJson(cdsrcPath) as Record<string, unknown>;
  }

  const devSection = (config['[development]'] as Record<string, unknown>) ?? {};
  const users: Record<string, { roles: string[] }> = {};

  for (const role of roles) {
    users[`${role}_user`] = { roles: [role] };
  }

  devSection['auth'] = { kind: 'mocked', users };
  config['[development]'] = devSection;

  await fsExtra.writeJson(cdsrcPath, config, { spaces: 2 });
  log(chalk.green('updated  .cdsrc.json (mocked auth)'));
}

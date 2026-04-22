import path from 'path';
import chalk from 'chalk';
import { promptText, promptSelect, promptConfirm, log } from '../../utils/prompt';
import { toPascalCase, toKebabCase, writeFileSafe, ensureDir } from '../../utils/fs';
import { renderEjs } from '../../utils/template';

const TEMPLATES_DIR = path.join(__dirname, '../../../templates/generators/action-tests');

interface ActionTestVars {
  service:     string;
  servicePath: string;
  action:      string;
  bound:       boolean;
  entity:      string;
}

export const actionTestsGenerator = {
  name: 'action-tests',
  description: 'Generate test harness for a CAP service action',

  async run(projectDir: string): Promise<void> {
    const serviceName = await promptText('service', 'Service name (e.g. IntegrationService):');
    const actionName  = await promptText('action', 'Action name (e.g. submit):');
    const boundStr    = await promptSelect('bound', 'Action type:', ['bound', 'unbound']);
    const bound       = boundStr === 'bound';
    const entityName  = bound
      ? await promptText('entity', 'Entity name (e.g. IntegrationItem):')
      : '';

    const service     = toPascalCase(serviceName);
    const action      = actionName.trim();
    const entity      = bound ? toPascalCase(entityName) : '';
    const servicePath = toKebabCase(service).replace(/-service$/, '');

    const vars: ActionTestVars = { service, servicePath, action, bound, entity };

    await ensureDir(path.join(projectDir, 'test/actions'));

    const fileMappings = [
      { tpl: 'action.test.js.ejs', dest: `test/actions/${action}.test.js` },
      { tpl: 'setup.js.ejs',       dest: 'test/actions/setup.js' },
    ];

    for (const { tpl, dest } of fileMappings) {
      const tplPath  = path.join(TEMPLATES_DIR, tpl);
      const destPath = path.join(projectDir, dest);
      const content  = await renderEjs(tplPath, vars as unknown as Record<string, unknown>);

      const written = await writeFileSafe(destPath, content, () =>
        promptConfirm(`overwrite-${dest}`, `  ${dest} already exists. Overwrite?`)
      );

      log(written ? chalk.green(`created  ${dest}`) : chalk.yellow(`skipped  ${dest}`));
    }
  },
};

import path from 'path';
import chalk from 'chalk';
import { promptText, promptConfirm, log } from '../../utils/prompt';
import { toPascalCase, toKebabCase, writeFileSafe } from '../../utils/fs';
import { renderEjs } from '../../utils/template';

const TEMPLATES_DIR = path.join(__dirname, '../../../templates/generators/comments');

interface CommentsVars {
  Entity:      string;
  entity:      string;
  Service:     string;
  servicePath: string;
  namespace:   string;
}

export const commentsGenerator = {
  name: 'comments',
  description: 'Add a comments entity and service projection to an existing entity',

  async run(projectDir: string): Promise<void> {
    const rawEntity  = await promptText('entity',    'Entity name to add comments to (e.g. IntegrationItem):');
    const rawService = await promptText('service',   'Service name (e.g. IntegrationService):');
    const namespace  = await promptText('namespace', 'CDS namespace (e.g. my.company):', 'my.company');

    const Entity      = toPascalCase(rawEntity.replace(/\s+/g, '-'));
    const entity      = toKebabCase(Entity);
    const rawPascal   = toPascalCase(rawService.replace(/\s+/g, '-'));
    const Service     = rawPascal.endsWith('Service') ? rawPascal : `${rawPascal}Service`;
    const servicePath = toKebabCase(Service.replace(/Service$/, ''));

    const vars: CommentsVars = { Entity, entity, Service, servicePath, namespace };

    const fileMappings = [
      { tpl: 'entity-comments.cds.ejs',        dest: `db/${entity}-comments.cds` },
      { tpl: 'entity-comments-service.cds.ejs', dest: `srv/${entity}-comments.cds` },
      { tpl: 'entity-comments-handler.js.ejs',  dest: `srv/${entity}-comments-handler.js` },
      { tpl: 'entity-comments.test.js.ejs',     dest: `test/${entity}-comments.test.js` },
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

    log(chalk.gray(`\n  Wire the author handler in your ${Service}.init():`));
    log(chalk.gray(`    const commentsHandler = require('./${entity}-comments-handler');`));
    log(chalk.gray(`    commentsHandler.register(this);`));
  },
};

import path from 'path';
import chalk from 'chalk';
import { promptText, promptConfirm, log } from '../../utils/prompt';
import { toPascalCase, toKebabCase, writeFileSafe } from '../../utils/fs';
import { renderEjs } from '../../utils/template';

const TEMPLATES_DIR = path.join(__dirname, '../../../templates/generators/draft-entity');

interface DraftEntityVars {
  Entity: string;
  entity: string;
  namespace: string;
  withSeed: boolean;
}

export const draftEntityGenerator = {
  name: 'draft-entity',
  description: 'Generate a CAP entity with @odata.draft.enabled',

  async run(projectDir: string): Promise<void> {
    const rawName   = await promptText('name', 'Entity name (PascalCase, e.g. Approval):');
    const namespace = await promptText('namespace', 'CDS namespace (e.g. my.company):', 'my.company');
    const withSeed  = await promptConfirm('withSeed', 'Include seed CSV?');

    const Entity = toPascalCase(rawName.replace(/\s+/g, '-'));
    const entity = toKebabCase(Entity);

    const vars: DraftEntityVars = { Entity, entity, namespace, withSeed };

    const fileMappings = [
      { tpl: 'entity.cds.ejs',          dest: `db/${entity}.cds` },
      { tpl: 'entity-service.cds.ejs',   dest: `srv/${entity}-service.cds` },
      { tpl: 'entity-handler.js.ejs',    dest: `srv/${entity}-service.js` },
      { tpl: 'entity.test.js.ejs',       dest: `test/${entity}.test.js` },
      ...(withSeed ? [{ tpl: 'Entity.csv.ejs', dest: `db/data/${Entity}.csv` }] : []),
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

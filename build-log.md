# Build log — cap-acc — 2026-04-22

> Generado automáticamente. Revisar para incorporar gaps al skill.

## Incidencias registradas

### draft-entity generator — handler file naming
- **Síntoma:** 501 "no handler for submit" — la acción no tenía handler.
- **Causa:** `index.ts` generaba `srv/approval-handler.js` pero CAP auto-descubre el handler buscando un archivo con el mismo nombre que el `.cds` del servicio (`srv/approval-service.js`).
- **Fix aplicado:** Cambiar `dest: srv/${entity}-handler.js` → `dest: srv/${entity}-service.js` en `packages/cli/src/generators/draft-entity/index.ts`.
- **Reference candidata:** `references/03-node-handlers.md` — añadir sección "Handler auto-discovery naming rule".

### draft-entity generator — validación en evento SAVE vs CREATE/UPDATE
- **Síntoma:** Tests de validación (`rejects blank title`) devolvían null — no se lanzaba error.
- **Causa:** Con `@odata.draft.enabled`, `before(['CREATE','UPDATE'], Entity, ...)` no se invoca durante el ciclo de vida del draft. La validación debe estar en `before('SAVE', Entity, ...)`, que se ejecuta en `draftActivate`.
- **Fix aplicado:** Cambiar el handler template a `before('SAVE', Entity, ...)` y los tests a validar via `draftActivate` en vez de POST directo.
- **Reference candidata:** `references/03-node-handlers.md` — actualizar sección "Draft entity validation — correct event targets".

### draft-entity generator — IsActiveEntity en WHERE clause
- **Síntoma:** 500 "Virtual elements are not allowed in expressions" en la acción submit.
- **Causa:** `IsActiveEntity` es un elemento virtual calculado en runtime — no existe como columna en la DB y no puede usarse en `where()`.
- **Fix aplicado:** Eliminar `IsActiveEntity: true` del `SELECT.one.from(Entity).where(...)` en el handler de la acción submit.
- **Reference candidata:** `references/03-node-handlers.md` — añadir nota sobre elementos virtuales de draft.

### draft-entity generator — @mandatory vs handler validation
- **Síntoma:** Test `rejects whitespace-only title` devolvía mensaje "Provide the missing value." en vez de "title must not be blank".
- **Causa:** La anotación `@mandatory` en el CDS intercepta tanto strings vacíos como strings de solo espacios, con mensaje genérico de CAP que no menciona el campo. Nuestro handler custom `before('SAVE')` nunca llegaba a ejecutarse para ese campo.
- **Fix aplicado:** Eliminar `@mandatory` del campo `title` en `entity.cds.ejs`; el handler propio gestiona toda la validación con mensajes de dominio específicos.
- **Reference candidata:** `references/11-cds-modeling-guardrails.md` — documentar conflicto `@mandatory` vs custom handler validation.

### @cap-js/cds-test — auth API
- **Síntoma:** 401 en todos los tests tras añadir `@requires: 'authenticated-user'`.
- **Causa:** `cds.test(...).as()` no existe en `@cap-js/cds-test@0.4.1`. El API correcto es `app.axios.defaults.auth = { username, password }`.
- **Fix aplicado:** Sustituir `.as()` por `app.axios.defaults.auth` en todos los templates de test.
- **Reference candidata:** `references/05-testing-deployment.md` — añadir sección sobre auth en cds-test 0.4.x.

### @argos/cap-ops — no publicado en npm
- **Síntoma:** E404 al hacer `npm install` en el proyecto generado por el starter.
- **Causa:** `@argos/cap-ops` no está publicado en npm. Estaba referenciado en `package.json.ejs` del starter.
- **Fix aplicado:** Eliminar la dependencia del `package.json.ejs` e inline el código de helmet/health directamente en `integration-service.js.ejs`.
- **Reference candidata:** No aplica a references — es una decisión de publicación del paquete.

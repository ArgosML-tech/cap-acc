# CAP Development Accelerator (`capx`)

CLI y librería de soporte para arrancar y extender proyectos SAP Cloud Application Programming Model (CAP) sin fricción.

## Paquetes

| Paquete | Nombre npm | Descripción |
|---|---|---|
| `packages/cli` | `@argos/capx` | CLI principal |
| `packages/lib` | `@argos/cap-lib` | Librería de soporte (streams, errors, logging) |
| `packages/cap-ops` | `@argos/cap-ops` | Hardening de producción (helmet, health endpoints, retry) |
| `packages/starters/integration-service` | `@argos/starter-integration-service` | Starter CAP para servicios de integración |

---

## Instalación

```bash
# Desde este repositorio (desarrollo)
git clone <repo>
cd cap-acc
npm install
npm run build
```

Para usar `capx` globalmente durante el desarrollo:

```bash
npm link --workspace=packages/cli
```

---

## Comandos

### `capx new <starter> <nombre>`

Crea un proyecto CAP nuevo desde un starter.

```bash
capx new integration-service my-app
cd my-app && npm install && npm start
```

**Starters disponibles:**

| Starter | Descripción |
|---|---|
| `integration-service` | Servicio OData con entidad principal, staging, handler, tests y hardening de producción |

El proyecto generado incluye:
- Modelo CDS con `IntegrationItems` y `StagingItems`
- Servicio con `@requires` y `@restrict` por rol
- Handler con acción `process`, logging y error handling tipado
- Tests de integración con `@cap-js/sqlite` en memoria
- Bootstrap de `@argos/cap-ops` (helmet + `/health` + `/ready`)
- `.cdsrc.json` con SQLite + auth mocked
- Pipeline CI base (GitHub Actions)

---

### `capx add <generator>`

Añade artefactos a un proyecto CAP existente. Ejecutar desde la raíz del proyecto.

```bash
cd my-app
capx add draft-entity
capx add mocked-auth
capx add action-tests
capx add audit-trail
capx add comments
```

---

#### `draft-entity`

Genera una entidad con `@odata.draft.enabled` completa: modelo, servicio con `@restrict`, handler con validación y acción `submit`, test suite con casos de error.

**Prompts:**
- Nombre de la entidad (e.g. `Approval`)
- Namespace CDS (e.g. `my.company`)
- ¿Incluir seed CSV?

**Artefactos generados:**
```
db/<entity>.cds                # entidad + campos de negocio
srv/<entity>-service.cds       # servicio con @restrict + acción submit
srv/<entity>-handler.js        # validación before(SAVE) + handler submit
test/<entity>.test.js          # draft lifecycle + validación + acción
db/data/<Entity>.csv           # seed (si se eligió)
```

**Wiring:** el handler se registra automáticamente si el servicio extiende `cds.ApplicationService`. No requiere pasos manuales.

---

#### `mocked-auth`

Añade usuarios mock por rol y actualiza `.cdsrc.json`.

**Prompts:**
- Roles a crear (coma-separados, e.g. `admin,viewer,editor`)

**Artefactos generados / modificados:**
```
test/users.mock.js     # constantes de usuario para tests
.cdsrc.json            # merge de [development].auth.users
```

---

#### `action-tests`

Genera un harness de tests para una acción de servicio CAP.

**Prompts:**
- Nombre del servicio (e.g. `IntegrationService`)
- Nombre de la acción (e.g. `process`)
- Tipo: `bound` / `unbound`
- Entidad (si es bound)

**Artefactos generados:**
```
test/actions/<action>.test.js   # happy path + rejection test
test/actions/setup.js           # configuración compartida
```

**Wiring:** el harness usa `it.skip` por defecto. Rellenar el ID de test y quitar `.skip` para activar.

---

#### `audit-trail`

Genera una entidad `<Entity>AuditLog` y un handler que captura quién cambió qué y cuándo.

**Prompts:**
- Nombre de la entidad a auditar (e.g. `IntegrationItem`)
- Nombre del servicio (e.g. `IntegrationService`)
- Namespace CDS

**Artefactos generados:**
```
db/<entity>-audit.cds              # AuditLog entity
srv/<entity>-audit.cds             # extend service + @readonly projection
srv/<entity>-audit-handler.js      # lógica de captura
test/<entity>-audit.test.js
```

**Wiring manual requerido:** importar y llamar `register(srv)` en el handler principal del servicio auditado:
```js
const { register } = require('./<entity>-audit-handler');
// dentro de init():
register(this);
```

---

#### `comments`

Genera una entidad `<Entity>Comments` y su proyección en el servicio existente.

**Prompts:**
- Nombre de la entidad (e.g. `IntegrationItem`)
- Nombre del servicio (e.g. `IntegrationService`)
- Namespace CDS

**Artefactos generados:**
```
db/<entity>-comments.cds           # Comments entity (parentId, text, author)
srv/<entity>-comments.cds          # extend service con Comments projection
srv/<entity>-comments-handler.js   # auto-set author en CREATE
test/<entity>-comments.test.js
```

**Wiring manual requerido:** importar y llamar `register(srv)` en el handler principal:
```js
const { register } = require('./<entity>-comments-handler');
// dentro de init():
register(this);
```

---

## Modo no-interactivo (CI)

Todos los generators aceptan la variable de entorno `CAPX_PRESET` con las respuestas en JSON:

```bash
CAPX_PRESET='{"name":"Approval","namespace":"my.company","withSeed":true}' \
  capx add draft-entity

CAPX_PRESET='{"roles":["admin","viewer"]}' \
  capx add mocked-auth

CAPX_PRESET='{"service":"IntegrationService","action":"process","bound":"unbound","entity":""}' \
  capx add action-tests

CAPX_PRESET='{"entity":"IntegrationItem","service":"IntegrationService","namespace":"my.app"}' \
  capx add audit-trail

CAPX_PRESET='{"entity":"IntegrationItem","service":"IntegrationService","namespace":"my.app"}' \
  capx add comments
```

---

## `@argos/cap-ops`

Hardening de producción para aplicaciones CAP. Incluido por defecto en el starter `integration-service`.

```js
const { helmet, health, retry } = require('@argos/cap-ops');

// En el bootstrap de la app:
cds.on('bootstrap', (app) => {
  helmet(app);          // HSTS, CSP, X-Frame-Options, Referrer-Policy
  health(app);          // GET /health → { status: 'UP' }
                        // GET /ready  → { status: 'READY', db: 'connected' }
});

// Para llamadas a servicios externos:
const result = await retry(
  () => ExternalService.run(req.send('GET', '/items')),
  { attempts: 3, delay: 500, factor: 2, on: [503, 429] }
);
```

Ver [docs/migration-mvp-to-production.md](docs/migration-mvp-to-production.md) para la guía de migración a BTP.

---

## `@argos/cap-lib`

Librería de utilidades para los proyectos generados. Dependencia opcional.

```js
const { createLogger, ApplicationError, ValidationError, streamToBuffer } = require('@argos/cap-lib');

const log = createLogger('MiServicio');
log.info('Procesando item', { correlationId: req.headers['x-correlation-id'] });

// En handlers:
if (!item) throw new ApplicationError('Not found', 404, 'NOT_FOUND');
```

**API:**

| Export | Descripción |
|---|---|
| `createLogger(component)` | Logger homogéneo con correlation ID |
| `ApplicationError(msg, status, code)` | Error base con código HTTP |
| `NotFoundError` / `ValidationError` / `AuthorizationError` | Errores tipados |
| `streamToBuffer(readable)` | Readable stream → Buffer |
| `bufferToBase64(buffer)` | Buffer → string base64 |

---

## Política Day-2

> El código generado pertenece al proyecto desde el primer commit.
> `capx` no actualiza proyectos ya creados.
> Las mejoras en templates se aplican solo a proyectos nuevos.

Los generators (`add`) sí pueden re-ejecutarse porque añaden artefactos nuevos, no modifican los ya editados por el desarrollador — salvo `.cdsrc.json`, que hace merge explícito.

---

## Validación end-to-end

```bash
cd playground
node test-generators.js
```

El script:
1. Compila el CLI
2. Crea `generated/test-app` desde el starter
3. Instala dependencias y pasa los tests base
4. Ejecuta los cinco generators en modo no-interactivo (`draft-entity`, `mocked-auth`, `action-tests`, `audit-trail`, `comments`)
5. Ejecuta `cds build` y la suite completa de tests

---

## Compatibilidad

Ver [docs/compatibility.md](docs/compatibility.md) para la tabla completa actualizada.

| Dependencia | Versión |
|---|---|
| `@sap/cds` | `^9.8` |
| Node.js | `>=20` |
| npm workspaces | `>=8` |

---

## Roadmap

Lo que existe hoy está en el repo y funciona. Lo que sigue está en discusión:

**Entregado:**
- CLI (`capx new`, `capx add`) con 5 generators
- Starter `integration-service` con hardening de producción
- `@argos/cap-lib` (logging, errors, streams)
- `@argos/cap-ops` (helmet, health endpoints, retry)
- Guía de migración MVP → producción
- Dashboard de compatibilidad de versiones

**En consideración para próximas iteraciones:**
- Starter `workflow-app` (máquina de estados explícita)
- Generator `ui-annotations` (anotaciones Fiori Elements básicas)
- Publicación en npm (`npm publish` / private registry)

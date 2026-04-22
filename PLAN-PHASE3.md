# CAP Development Accelerator — Plan Fase 3

**Prerequisito:** Fases 1 y 2 completas y validadas (`test-generators.js` pasa al 100%).

---

## 1. `@argos/cap-ops`

### Objetivo

Paquete npm independiente que proporciona hardening de producción a cualquier aplicación CAP generada con `capx`. Opcional por diseño: un proyecto puede eliminarlo sin romper nada.

### Estructura del paquete

```
packages/cap-ops/
├── src/
│   ├── helmet.js        # middleware de seguridad HTTP
│   ├── health.js        # endpoints /health y /ready
│   ├── retry.js         # retry con backoff exponencial
│   └── index.js         # re-exports
├── package.json
└── README.md
```

### API pública

#### `helmet(app, options?)`

Aplica cabeceras de seguridad HTTP sobre el servidor Express que CDS expone internamente.

```js
const { helmet } = require('@argos/cap-ops');
cds.on('bootstrap', (app) => helmet(app));
```

Cabeceras configuradas por defecto:
- `Strict-Transport-Security` (HSTS): `max-age=31536000; includeSubDomains`
- `X-Content-Type-Options`: `nosniff`
- `X-Frame-Options`: `DENY`
- `Content-Security-Policy`: política restrictiva, configurable vía options
- `Referrer-Policy`: `no-referrer`

Options:
```js
{
  hsts:  true,          // activar HSTS (default: true)
  csp:   true,          // activar CSP (default: true)
  cspDirectives: {}     // merge con la política CSP base
}
```

#### `health(app, options?)`

Registra dos endpoints REST en el servidor CDS:

| Endpoint | Método | Respuesta happy path |
|---|---|---|
| `/health` | GET | `200 { status: "UP", timestamp: "..." }` |
| `/ready`  | GET | `200 { status: "READY", db: "connected" }` |

`/ready` hace un `SELECT 1` contra la base de datos CDS antes de responder. Si falla → `503 { status: "NOT_READY", reason: "..." }`.

Options:
```js
{
  path:       '/health',   // prefijo base (default: raíz)
  dbCheck:    true,        // activar check de BD en /ready (default: true)
  extraChecks: []          // array de funciones async () => { ok, name, detail }
}
```

#### `retry(fn, options?)`

Envuelve una función async con retry y backoff exponencial. Útil para llamadas a sistemas externos (S/4, BTP services).

```js
const { retry } = require('@argos/cap-ops');

const result = await retry(
  () => ExternalService.run(req.send('GET', '/items')),
  { attempts: 3, delay: 500, factor: 2, on: [503, 429] }
);
```

Options:
```js
{
  attempts: 3,      // nº máximo de intentos
  delay:    500,    // ms de espera inicial
  factor:   2,      // multiplicador por intento (backoff exponencial)
  on:       [503, 429, 'ETIMEDOUT']  // códigos/errores que disparan retry
}
```

### Dependencias

```json
{
  "dependencies": {},
  "peerDependencies": {
    "@sap/cds": "^9.x"
  },
  "devDependencies": {
    "mocha": "^10.x",
    "sinon": "^17.x"
  }
}
```

Sin dependencias de producción directas. `helmet` se implementa manualmente (sin el paquete `helmet` de npm) para evitar transponer dependencias no auditadas a todos los proyectos consumidores.

### Integración con el starter

Añadir en `packages/starters/integration-service/template/srv/integration-service.js.ejs`:

```js
const { helmet, health } = require('@argos/cap-ops');

cds.on('bootstrap', (app) => {
  helmet(app);
  health(app);
});
```

Y en `template/package.json.ejs`:

```json
"@argos/cap-ops": "^1.0.0"
```

### Criterio de aceptación

- [ ] `npm test` en el paquete pasa (unit tests de cada utilidad)
- [ ] `GET /health` responde 200 en un proyecto `integration-service` de prueba
- [ ] `GET /ready` responde 503 si la BD no está disponible
- [ ] `retry` reintenta exactamente `attempts` veces y luego lanza
- [ ] Sin dependencias de producción que no sean `@sap/cds`

---

## 2. Guía de migración MVP → Producción

### Objetivo

Documento técnico (Markdown) que un desarrollador que ha generado un proyecto con `capx new integration-service` puede seguir paso a paso para llevarlo a un entorno productivo en SAP BTP.

### Ubicación

```
cap-acc/docs/migration-mvp-to-production.md
```

### Estructura del documento

```
# Migración MVP → Producción

## 1. Prerequisitos
## 2. Hardening de seguridad
   2.1 Pasar de `auth: mocked` a XSUAA
   2.2 Añadir `@argos/cap-ops` (helmet + health)
   2.3 Revisar anotaciones @restrict en el modelo CDS
## 3. Base de datos
   3.1 Migrar de SQLite a SAP HANA Cloud
   3.2 Generar artefactos HDI con `cds build --for hana`
   3.3 Gestión de migraciones de esquema
## 4. Variables de entorno y secrets
   4.1 Fichero .env para local, VCAP_SERVICES para BTP
   4.2 No hardcodear credenciales: usar cds.env y cf bind-service
## 5. Deployment en Cloud Foundry
   5.1 mta.yaml mínimo para una app CAP
   5.2 cf push vs. cf deploy (MTA)
   5.3 Health checks y readiness
## 6. Deployment en Kyma (alternativa)
   6.1 Helm chart mínimo
   6.2 ConfigMap para cds.env
   6.3 Liveness y readiness probes apuntando a /health y /ready
## 7. Checklist de go-live
   - [ ] cds build sin warnings
   - [ ] npm audit sin vulnerabilidades high/critical
   - [ ] XSUAA configurado y probado con usuario real
   - [ ] /ready responde 200 en staging
   - [ ] Logs con correlation ID visibles en BTP Observability
```

### Criterio de aceptación

- [ ] Un desarrollador nuevo puede seguir el documento sin preguntas de bloqueo
- [ ] Todos los comandos del documento están verificados contra `@sap/cds@^9.x`
- [ ] El documento referencia `@argos/cap-ops` donde corresponde

---

## 3. Dashboard de compatibilidad de versiones

### Objetivo

Tabla versionada y mantenible que mapea las combinaciones soportadas de `@sap/cds`, Node.js y plataformas BTP. Se genera automáticamente desde un fichero de datos y se publica como parte de la documentación del accelerator.

### Implementación

#### Fuente de verdad

```
cap-acc/scripts/compat-matrix.json
```

```json
{
  "updated": "2025-04-21",
  "matrix": [
    {
      "cds":      "^9.8",
      "node":     ">=20",
      "sqlite":   "@cap-js/sqlite ^2.0",
      "hana":     "@cap-js/hana ^2.0",
      "cf":       "supported",
      "kyma":     "supported",
      "notes":    "Versión objetivo del accelerator"
    },
    {
      "cds":      "^8.x",
      "node":     ">=18",
      "sqlite":   "@cap-js/sqlite ^1.x",
      "hana":     "@cap-js/hana ^1.x",
      "cf":       "supported",
      "kyma":     "supported",
      "notes":    "LTS anterior, soporte hasta fin 2025"
    }
  ]
}
```

#### Script generador

```
cap-acc/scripts/generate-compat-table.js
```

Lee `compat-matrix.json` y escribe `docs/compatibility.md` con una tabla Markdown formateada. Se ejecuta en CI cuando cambia el JSON.

#### Salida generada

```
cap-acc/docs/compatibility.md
```

```markdown
# Tabla de compatibilidad de versiones

> Actualizada: 2025-04-21

| @sap/cds | Node.js | @cap-js/sqlite | @cap-js/hana | CF | Kyma | Notas |
|---|---|---|---|---|---|---|
| ^9.8 | >=20 | ^2.0 | ^2.0 | ✅ | ✅ | Versión objetivo del accelerator |
| ^8.x | >=18 | ^1.x | ^1.x | ✅ | ✅ | LTS anterior, soporte hasta fin 2025 |
```

#### Integración CI

En `.github/workflows/ci.yml`, añadir job:

```yaml
compat-table:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: node scripts/generate-compat-table.js
    - name: Fail if table is out of date
      run: git diff --exit-code docs/compatibility.md
```

El job falla si alguien modifica `compat-matrix.json` sin regenerar la tabla.

### Criterio de aceptación

- [ ] `node scripts/generate-compat-table.js` genera `docs/compatibility.md` sin errores
- [ ] La tabla refleja fielmente el contenido de `compat-matrix.json`
- [ ] El job CI detecta divergencia entre JSON y tabla generada

---

## 4. Orden de implementación recomendado

```
1. @argos/cap-ops          → valor inmediato, desbloquea el starter en producción
2. Guía de migración       → depende de cap-ops para las secciones de hardening
3. Dashboard compatibilidad → independiente, puede hacerse en paralelo con la guía
```

## 5. Dependencias entre items

```
cap-ops ──► guía de migración (sección 2.2)
compat-matrix.json ──► generate-compat-table.js ──► docs/compatibility.md
```

El dashboard no bloquea nada; la guía no puede completarse antes de que `cap-ops` esté estable.

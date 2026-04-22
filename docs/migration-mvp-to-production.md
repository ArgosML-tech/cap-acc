# Migración MVP → Producción

Guía paso a paso para llevar un proyecto generado con `capx new integration-service` a un entorno productivo en SAP BTP. Verificada contra `@sap/cds ^9.x`.

---

## 1. Prerequisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 20 |
| npm | 8 |
| `@sap/cds-dk` | ^9.8 (instalar globalmente: `npm i -g @sap/cds-dk`) |
| Cloud Foundry CLI | v8+ (`cf --version`) |
| MTA Build Tool | `npm i -g mbt` |
| SAP BTP subaccount | con Cloud Foundry Space aprovisionado |

Verificar el entorno local antes de continuar:

```bash
node --version   # >= 20
cds --version    # >= 9.8
cf --version     # >= 8
```

---

## 2. Hardening de seguridad

### 2.1 Pasar de `auth: mocked` a XSUAA

En desarrollo, el proyecto usa autenticación simulada definida en `.cdsrc.json`:

```json
{
  "[development]": {
    "auth": { "kind": "mocked", "users": { ... } }
  }
}
```

Para producción, reemplazar por XSUAA:

**`package.json` — añadir dependencia:**
```bash
npm add @sap/xssec passport
```

**`.cdsrc.json` — sección `[production]`:**
```json
{
  "[production]": {
    "auth": { "kind": "xsuaa" }
  }
}
```

**`xs-security.json` — descriptor de la instancia XSUAA:**
```json
{
  "xsappname": "my-app",
  "tenant-mode": "dedicated",
  "scopes": [
    { "name": "$XSAPPNAME.read",  "description": "Lectura" },
    { "name": "$XSAPPNAME.write", "description": "Escritura" }
  ],
  "role-templates": [
    {
      "name": "Viewer",
      "description": "Solo lectura",
      "scope-references": ["$XSAPPNAME.read"]
    },
    {
      "name": "Editor",
      "description": "Lectura y escritura",
      "scope-references": ["$XSAPPNAME.read", "$XSAPPNAME.write"]
    }
  ]
}
```

Crear la instancia en BTP:
```bash
cf create-service xsuaa application my-app-xsuaa -c xs-security.json
```

### 2.2 Añadir `@argos/cap-ops` (helmet + health)

El starter ya incluye `@argos/cap-ops` como dependencia y lo inicializa en `srv/integration-service.js`. Verificar que el bootstrap está activo:

```js
const { helmet, health } = require('@argos/cap-ops');

cds.on('bootstrap', (app) => {
  helmet(app);          // cabeceras de seguridad HTTP
  health(app);          // /health y /ready
});
```

En producción, `health(app)` realiza un `SELECT 1` contra la BD antes de responder `/ready`. Este endpoint se usa como readiness probe en CF y Kyma.

Para personalizar la CSP (p.ej., permitir recursos de SAP UI5 CDN):
```js
helmet(app, {
  cspDirectives: {
    'script-src': ["'self'", 'ui5.sap.com'],
    'style-src':  ["'self'", 'ui5.sap.com', "'unsafe-inline'"],
  }
});
```

### 2.3 Revisar anotaciones `@restrict` en el modelo CDS

Toda entidad expuesta en producción debe tener restricciones explícitas. Ejemplo completo:

```cds
service IntegrationService @(requires: 'authenticated-user') {
  entity IntegrationItems @(restrict: [
    { grant: 'READ',  to: 'Viewer' },
    { grant: ['WRITE', 'DELETE'], to: 'Editor' }
  ]) as projection on db.IntegrationItems;
}
```

Verificar con:
```bash
npx cds compile srv/ --to json | node -e "
  const m = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  Object.values(m.definitions)
    .filter(d => d['@restrict'])
    .forEach(d => console.log(d.name, JSON.stringify(d['@restrict'])));
"
```

---

## 3. Base de datos

### 3.1 Migrar de SQLite a SAP HANA Cloud

En desarrollo se usa `@cap-js/sqlite`. Para producción:

```bash
npm add @cap-js/hana
```

Añadir en `.cdsrc.json`:
```json
{
  "[production]": {
    "db": { "kind": "hana" }
  }
}
```

### 3.2 Generar artefactos HDI con `cds build --for hana`

```bash
npx cds build --for hana
```

Esto genera `gen/db/` con los artefactos `.hdbcds`/`.hdbtabledata` listos para un HDI container.

### 3.3 Gestión de migraciones de esquema

CAP gestiona las migraciones automáticamente en modo `hana` mediante `cds deploy`. Para entornos con datos existentes:

```bash
# Vista previa de cambios sin aplicar
npx cds deploy --dry

# Aplicar con VCAP_SERVICES configurado
npx cds deploy --to hana
```

> **Atención:** `cds deploy` en HANA aplica cambios destructivos si las columnas se eliminan. Revisar siempre la salida de `--dry` antes de ejecutar en producción.

---

## 4. Variables de entorno y secrets

### 4.1 Fichero `.env` para local, `VCAP_SERVICES` para BTP

En local, usar `.env` (ya incluido como `.env.example` en el starter):

```
# .env (nunca committear — está en .gitignore)
CDS_LOG_LEVEL=debug
```

En BTP / Cloud Foundry, las credenciales llegan vía `VCAP_SERVICES` como JSON inyectado por la plataforma. CAP las lee automáticamente.

### 4.2 No hardcodear credenciales

Usar `cds.env` para acceder a configuración en handlers:

```js
const { mySecret } = cds.env.requires['my-service'].credentials;
```

Vincular servicios en CF:
```bash
cf bind-service my-app my-app-xsuaa
cf bind-service my-app my-app-hdi
cf restage my-app
```

---

## 5. Deployment en Cloud Foundry

### 5.1 `mta.yaml` mínimo para una app CAP

```yaml
_schema-version: "3.1"
ID: my-app
version: 1.0.0

modules:
  - name: my-app-srv
    type: nodejs
    path: gen/srv
    parameters:
      buildpack: nodejs_buildpack
      memory: 256M
      disk-quota: 512M
    requires:
      - name: my-app-xsuaa
      - name: my-app-hdi
    provides:
      - name: srv-api
        properties:
          srv-url: ${default-url}

  - name: my-app-db
    type: hdb
    path: gen/db
    requires:
      - name: my-app-hdi

resources:
  - name: my-app-xsuaa
    type: org.cloudfoundry.managed-service
    parameters:
      service: xsuaa
      service-plan: application
      path: ./xs-security.json

  - name: my-app-hdi
    type: org.cloudfoundry.managed-service
    parameters:
      service: hana
      service-plan: hdi-shared
```

### 5.2 `cf push` vs. `cf deploy` (MTA)

| Método | Cuándo usar |
|---|---|
| `cf push` | Apps simples sin HDI, pruebas rápidas |
| `cf deploy` (MTA) | Producción: gestiona módulos, servicios y orden de deploy |

Para deploy con MTA:
```bash
# Construir el archivo .mtar
mbt build

# Desplegar
cf deploy mta_archives/my-app_1.0.0.mtar
```

### 5.3 Health checks y readiness

Configurar en el `mta.yaml` o directamente en CF:
```bash
cf set-health-check my-app-srv http --endpoint /health
```

CAP no expone `/health` por defecto — es precisamente lo que provee `@argos/cap-ops`.

---

## 6. Deployment en Kyma (alternativa)

### 6.1 Helm chart mínimo

```
chart/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    └── configmap.yaml
```

`Chart.yaml`:
```yaml
apiVersion: v2
name: my-app
version: 1.0.0
```

`templates/deployment.yaml` (fragmento):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-srv
spec:
  replicas: {{ .Values.replicas | default 1 }}
  template:
    spec:
      containers:
        - name: srv
          image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
          ports:
            - containerPort: 4004
          envFrom:
            - configMapRef:
                name: {{ .Release.Name }}-config
          livenessProbe:
            httpGet:
              path: /health
              port: 4004
            initialDelaySeconds: 15
          readinessProbe:
            httpGet:
              path: /ready
              port: 4004
            initialDelaySeconds: 10
```

### 6.2 ConfigMap para `cds.env`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-config
data:
  NODE_ENV: production
  CDS_LOG_LEVEL: info
```

### 6.3 Liveness y readiness probes apuntando a `/health` y `/ready`

- **Liveness** (`/health`): responde 200 si el proceso está vivo. CAP no reinicia el pod si la BD está caída transitoriamente.
- **Readiness** (`/ready`): responde 200 solo si la BD está conectada. Kubernetes retira el pod del load balancer si falla.

Configuración recomendada:
```yaml
livenessProbe:
  httpGet:    { path: /health, port: 4004 }
  initialDelaySeconds: 15
  periodSeconds: 30
  failureThreshold: 3

readinessProbe:
  httpGet:    { path: /ready, port: 4004 }
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 2
```

---

## 7. Checklist de go-live

- [ ] `npx cds build` sin warnings
- [ ] `npm audit` sin vulnerabilidades `high` o `critical`
- [ ] XSUAA configurado: instancia creada, `xs-security.json` con scopes correctos
- [ ] Probado con usuario real (no mock) en staging
- [ ] `/ready` responde 200 en staging con HANA conectado
- [ ] `/health` configurado como health check en CF o como liveness probe en Kyma
- [ ] Variables de entorno: ningún secret hardcodeado en código o en el repositorio
- [ ] `.env` en `.gitignore`
- [ ] Logs con correlation ID visibles en BTP Observability (usar `@argos/cap-lib` logger)
- [ ] `mta.yaml` revisado: versiones de servicios BTP correctas para el subaccount
- [ ] Rollback plan documentado: cómo revertir el MTA si el deploy falla

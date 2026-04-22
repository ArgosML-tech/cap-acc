# CAP Development Accelerator — Plan técnico

**Alcance acordado (Fase 1):** CLI + `integration-service` starter + 3 generators (`draft-entity`, `mocked-auth`, `action-tests`)

---

## 1. Estructura del repositorio

```
cap-acc/
├── packages/
│   ├── cli/                    # @argos/capx — CLI principal
│   ├── starters/
│   │   └── integration-service/  # starter plantilla
│   └── lib/                    # @argos/cap-lib — support library ligera
├── playground/                 # workspace de validación end-to-end
├── scripts/                    # scripts de mantenimiento del propio accelerator
├── package.json                # npm workspaces raíz
└── PLAN.md
```

**npm workspaces** en la raíz agrupa los tres paquetes. Cada uno es publicable de forma independiente.

---

## 2. Paquete CLI — `@argos/capx`

### 2.1 Entrada

```
packages/cli/
├── src/
│   ├── index.ts            # entry point, registra comandos
│   ├── commands/
│   │   ├── new.ts          # capx new <starter> <nombre>
│   │   └── add.ts          # capx add <generator>
│   ├── generators/
│   │   ├── draft-entity/
│   │   │   ├── index.ts
│   │   │   └── templates/  # archivos .hbs o .ejs
│   │   ├── mocked-auth/
│   │   │   ├── index.ts
│   │   │   └── templates/
│   │   └── action-tests/
│   │       ├── index.ts
│   │       └── templates/
│   └── utils/
│       ├── fs.ts           # helpers de lectura/escritura de archivos
│       ├── prompt.ts       # wrappers de input interactivo
│       └── template.ts     # motor de renderizado de templates
├── package.json
└── tsconfig.json
```

### 2.2 Comandos expuestos

| Comando | Descripción |
|---|---|
| `capx new integration-service <name>` | Crea un nuevo repo desde el starter |
| `capx add draft-entity` | Genera entidad draft en proyecto existente |
| `capx add mocked-auth` | Añade usuarios mock y config de auth |
| `capx add action-tests` | Genera harness de tests para acciones |

### 2.3 Motor de templates

- Renderizado con **[EJS](https://ejs.co/)** — sin dependencias pesadas, nativo Node.js
- Variables inyectadas por prompt interactivo (nombre de entidad, namespace, etc.)
- Cada generator declara su propio `schema.json` con las variables que necesita
- Los archivos generados son código propio del proyecto desde el primer commit — no hay actualización posterior (política Day-2 explícita)

### 2.4 Dependencias CLI

```json
{
  "commander": "^12.x",    // parsing de comandos
  "ejs": "^3.x",           // templates
  "enquirer": "^2.x",      // prompts interactivos
  "fs-extra": "^11.x",     // operaciones de filesystem
  "chalk": "^5.x"          // output coloreado
}
```

Sin Yeoman, sin Plop. El motor propio es más simple y más fácil de mantener.

---

## 3. Starter — `integration-service`

### 3.1 Qué genera

```
<nombre>/
├── db/
│   ├── schema.cds          # entidad principal + staging
│   └── data/
│       └── seed.csv        # seed mínimo
├── srv/
│   ├── integration-service.cds   # servicio OData + proyección
│   └── integration-service.js    # handler base (error handling + logging)
├── test/
│   ├── integration.test.js       # test de integración happy path
│   └── mock-external.js          # mock del sistema externo
├── .cdsrc.json             # config local SQLite + auth mocked
├── .env.example
├── package.json
├── README.md
└── .github/
    └── workflows/
        └── ci.yml          # pipeline base opcional
```

### 3.2 Criterio de aceptación del starter

Al ejecutar `capx new integration-service my-app`:
1. `npm install` sin errores
2. `npm start` arranca en `localhost:4004`
3. `npm test` pasa sin modificaciones manuales
4. El `$metadata` expone la entidad principal

### 3.3 Qué NO incluye el starter

- Lógica de negocio del dominio
- Máquina de estados
- Reglas de validación específicas
- UI annotations (se añaden a mano o con generator futuro)

---

## 4. Generators

### 4.1 `draft-entity`

**Trigger:** `capx add draft-entity`

**Prompts:**
- Nombre de la entidad (ej. `Approval`)
- Namespace CDS (ej. `com.argos`)
- ¿Incluir seeds? (s/n)

**Artefactos generados:**
```
db/<entity>.cds          # definición con @odata.draft.enabled
srv/<entity>-service.cds # proyección de servicio
srv/<entity>-handler.js  # handler vacío con comentarios de extensión
test/<entity>.test.js    # test base: create draft → activate
db/data/<Entity>.csv     # seed mínimo (si se pidió)
```

**Política de conflictos:** si el archivo ya existe, preguntar antes de sobreescribir.

**Criterio de aceptación:** el artefacto generado pasa `cds build` y el test base pasa.

---

### 4.2 `mocked-auth`

**Trigger:** `capx add mocked-auth`

**Prompts:**
- Roles a crear (lista separada por comas, ej. `admin,viewer,editor`)
- Usuarios mock por rol (1 por rol por defecto)

**Artefactos generados / modificados:**
```
.cdsrc.json              # modifica [development].auth = { kind: "mocked", users: [...] }
test/users.mock.js       # exporta constantes de usuario para uso en tests
```

**Política:** si `.cdsrc.json` ya tiene `auth`, mergear en vez de sobreescribir.

**Criterio de aceptación:** `npm start` en modo development usa los usuarios generados sin configuración adicional.

---

### 4.3 `action-tests`

**Trigger:** `capx add action-tests`

**Prompts:**
- Nombre del servicio (ej. `IntegrationService`)
- Nombre de la acción (ej. `submit`)
- ¿Bound o unbound? (bound/unbound)
- Entidad asociada (si bound)

**Artefactos generados:**
```
test/actions/<action>.test.js   # happy path + rejection test
test/actions/setup.js           # setup compartido de tests de acciones
```

**Qué incluye el test generado:**
- Import de `@cap-js/sqlite` para test DB
- Usuario mock con rol autorizado
- Test: acción ejecuta sin error
- Test: acción rechaza sin rol
- Placeholder para validaciones de negocio

**Criterio de aceptación:** el test generado pasa sin modificaciones si la acción existe y está wired.

---

## 5. Support Library — `@argos/cap-lib`

Alcance mínimo para Fase 1. Solo lo que usan los starters y generators generados.

```
packages/lib/
├── src/
│   ├── streams.js      # streamToBuffer, bufferToBase64
│   ├── errors.js       # ApplicationError con código HTTP
│   ├── logging.js      # logger homogéneo con correlation ID básico
│   └── index.js        # re-exports
├── package.json
└── README.md
```

**Restricción:** sin dependencias fuera de Node.js stdlib y `@sap/cds`. No transportar `express`, `helmet` u otros en esta lib.

La lib es **opcional**. Los starters la referencian pero cualquier proyecto puede eliminar la dependencia y copiar las 3 funciones inline sin romper nada.

---

## 6. Playground

```
playground/
├── package.json         # workspace package, no publicable
├── test-generators.sh   # script: ejecuta cada generator y valida output
└── generated/           # output de tests de generators (.gitignored)
```

**Validación automática del accelerator:**

```bash
# test-generators.sh hace:
capx new integration-service test-app && cd generated/test-app && npm i && npm test
capx add draft-entity       # dentro de test-app
npx cds build               # debe pasar
capx add mocked-auth
capx add action-tests
npm test                    # suite completa debe pasar
```

Este script es el criterio de aceptación del propio accelerator.

---

## 7. Política Day-2 (explícita)

> El código generado pertenece al proyecto desde el primer commit.
> `capx` no actualiza proyectos ya creados.
> Las mejoras en templates se aplican a proyectos nuevos, no a los existentes.

Consecuencia: los generators (`add`) sí pueden re-ejecutarse en proyectos existentes porque añaden artefactos nuevos, no modifican los ya editados por el desarrollador (salvo `.cdsrc.json` con merge explícito).

---

## 8. Compatibilidad

| Dependencia | Versión objetivo |
|---|---|
| `@sap/cds` | `^9.x` |
| Node.js | `>=20` |
| npm workspaces | `>=8` |

---

## 9. Fases de implementación

### Fase 1 — Valor inmediato (este plan)

- [ ] Estructura de repo + npm workspaces
- [ ] CLI base (`commander`, comandos `new` y `add`)
- [ ] Motor de templates (EJS + fs-extra)
- [ ] Starter `integration-service` completo y validado
- [ ] Generator `draft-entity`
- [ ] Generator `mocked-auth`
- [ ] Generator `action-tests`
- [ ] Support library mínima (`streams`, `errors`, `logging`)
- [ ] Playground + `test-generators.sh`

**Criterio de cierre de Fase 1:** `test-generators.sh` pasa de principio a fin sin intervención manual.

### Fase 2 — Consolidación (fuera de este plan)

- Starter `workflow-app` (cuando haya 2+ casos reales que validar)
- Generator `audit-trail`
- Generator `comments`
- Pipeline CI base

### Fase 3 — Endurecimiento (fuera de este plan)

- `@argos/cap-ops` (helmet, health, retries)
- Documentación de migración MVP → productivo
- Dashboard de compatibilidad de versiones

---

## 10. Decisiones arquitectónicas registradas

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Motor de templates propio (EJS) | Yeoman / Plop | Menos dependencias, más mantenible, sin magia |
| Política Day-2: no actualización | Templates versionados con upgrade path | Reduce complejidad; el código generado es del dev |
| Support lib opcional | Lib obligatoria | Proyectos no deben quedar bloqueados por una dependencia |
| `workflow-app` starter diferido | Incluirlo en Fase 1 | Cada caso de uso tiene semántica de estado distinta; prematuramente genérico |
| EJS sobre Handlebars | Handlebars | EJS permite lógica condicional inline sin helpers registrados |

---

## 11. Lo que este plan NO hace

- No implementa `workflow-app` starter
- No implementa `@argos/cap-ops` (helmet, health endpoints avanzados)
- No define integración con el portfolio existente (ber-app, cap-mil, cap-exc)
- No establece proceso de publicación npm (`npm publish`)
- No define gobierno de versiones entre capa común y repos hijos

Estos puntos quedan para Fases 2 y 3 o para decisión explícita del equipo.

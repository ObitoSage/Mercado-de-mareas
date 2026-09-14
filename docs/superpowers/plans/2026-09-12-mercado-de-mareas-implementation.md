# Mercado de Mareas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir, probar, documentar y publicar un juego web de comercio marítimo por turnos en el que una persona compite contra una estrategia controlada por Express.

**Architecture:** Monorepo npm con una SPA React, un servidor Express autoritativo y un paquete de contratos compartidos. El motor de reglas y la IA son módulos puros; Express conserva partidas en memoria, expone una API JSON y sirve el frontend compilado desde el mismo puerto.

**Tech Stack:** Node.js 24, npm workspaces, React 19, TypeScript 7, Vite 8, Express 5, CSS propio, Vitest 5, React Testing Library, Supertest, Playwright 1.63, ESLint y Render Web Service.

**Spec:** `docs/superpowers/specs/2026-09-12-mercado-de-mareas-design.md`

## Global Constraints

- Frontend obligatorio: React + TypeScript.
- Backend obligatorio: Express + TypeScript.
- Comunicación obligatoria: API HTTP REST con `fetch` y JSON.
- Producción: frontend y backend en un único dominio y puerto.
- Interfaz: HTML semántico, CSS Grid y CSS propio; sin bibliotecas de componentes.
- Prohibido: Bootstrap, Tailwind, Axios, React Router, Redux y motores de videojuegos.
- Partida: jugador contra IA de Express, tablero 7 × 7, 10 rondas y 2 puntos de acción por turno.
- Estado oficial: memoria del proceso de Express; no hay base de datos.
- Variabilidad: generador sembrado para mareas, existencias, reposiciones y desempates.
- Calidad: TDD unitario, pruebas de componentes, integración HTTP y E2E.
- CI/CD: tres workflows separados para lint, E2E y deployment.
- Despliegue: Render sin Docker.
- Control de versiones: el agente no ejecuta `git add`, `git commit` ni `git push`; al final de cada task se detiene para revisión y commit manual del usuario.
- Publicación: primer push de control al terminar despliegue inicial; segundo push para la entrega final.
- Corte del repositorio: 2026-09-15 a las 16:00 según la hora registrada por GitHub; no se realizarán cambios posteriores.
- Defensa/examen: 2026-09-16, con aplicación publicada y prueba E2E visual preparadas.

---

## File Map

```text
.
├── .github/workflows/{lint,e2e,deploy}.yml
├── apps
│   ├── backend
│   │   ├── src
│   │   │   ├── ai/{score,strategy}.ts
│   │   │   ├── domain/{board,create-game,errors,game-engine,market,random,rules,turns}.ts
│   │   │   ├── http/{game-routes,parse-action}.ts
│   │   │   ├── app.ts
│   │   │   ├── game-store.ts
│   │   │   └── server.ts
│   │   └── tests
│   └── frontend
│       ├── src
│       │   ├── api/game-api.ts
│       │   ├── components/{ActionPanel,ErrorBanner,EventLog,GameBoard,PlayerPanel,StatusBar}.tsx
│       │   ├── hooks/useGame.ts
│       │   ├── screens/{GameScreen,HomeScreen,ResultScreen}.tsx
│       │   ├── styles/{base,game}.css
│       │   ├── App.tsx
│       │   └── main.tsx
│       └── tests
├── packages/shared/src/{api,game,index}.ts
├── tests/e2e/{game-flow,invalid-action,result}.spec.ts
├── docs
├── eslint.config.js
├── playwright.config.ts
├── render.yaml
├── tsconfig.base.json
└── package.json
```

`shared` contiene contratos serializables; `domain` contiene reglas sin HTTP; `http` traduce solicitudes; `frontend/api` es el único acceso a `fetch`; los componentes solo representan estado y emiten intenciones.

---

### Task 1: Scaffold del monorepo y contratos compartidos

**Files:**
- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `eslint.config.js`
- Create: `apps/frontend/package.json`
- Create: `apps/frontend/tsconfig.json`
- Create: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/game.ts`
- Create: `packages/shared/src/api.ts`
- Create: `packages/shared/src/index.ts`
- Test: `packages/shared/src/game.test.ts`

**Interfaces:**
- Consumes: ninguna; esta task fija el vocabulario del resto del sistema.
- Produces: `GameState`, `PlayerState`, `Tile`, `GameAction`, `GameEvent`, `GameResult`, `ApiError`, `GAME_RULES` e `isGameAction(value)`.

- [x] **Step 1: Crear manifiestos mínimos de workspaces**

Crear el `package.json` raíz con los workspaces `apps/*` y `packages/*`, Node `>=24 <25` y estos scripts exactos:

```json
{
  "name": "mercado-de-mareas",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "dev": "npm run build -w @mercado/shared && concurrently -k -n api,web \"npm run dev -w @mercado/backend\" \"npm run dev -w @mercado/frontend\"",
    "build": "npm run build -w @mercado/shared && npm run build -w @mercado/frontend && npm run build -w @mercado/backend",
    "start": "npm run start -w @mercado/backend",
    "lint": "eslint .",
    "typecheck": "npm run build -w @mercado/shared && npm run typecheck -w @mercado/backend && npm run typecheck -w @mercado/frontend",
    "test": "npm run build -w @mercado/shared && npm run test -w @mercado/shared && npm run test -w @mercado/backend && npm run test -w @mercado/frontend",
    "e2e": "playwright test",
    "e2e:headed": "playwright test --project=chrome --headed",
    "verify": "npm run lint && npm run typecheck && npm run test && npm run build"
  }
}
```

Los manifiestos de workspace deben llamarse `@mercado/frontend`, `@mercado/backend` y `@mercado/shared`. `shared` exporta `./dist/index.js`; frontend y backend declaran `"@mercado/shared": "*"`. Sus scripts son exactos:

- Shared: `build: tsc -p tsconfig.json`, `typecheck: tsc -p tsconfig.json --noEmit`, `test: vitest run`.
- Backend: `dev: tsx watch src/server.ts`, `build: tsc -p tsconfig.json`, `start: node dist/server.js`, `typecheck: tsc -p tsconfig.json --noEmit`, `test: vitest run`.
- Frontend: `dev: vite`, `build: tsc -b && vite build`, `preview: vite preview`, `typecheck: tsc -p tsconfig.json --noEmit`, `test: vitest run`.

- [x] **Step 2: Instalar dependencias y generar el lockfile**

Run:

```powershell
npm install react react-dom -w @mercado/frontend
npm install express -w @mercado/backend
npm install -D typescript@^7.0.2 vitest@^5.0.0 eslint @eslint/js typescript-eslint globals eslint-plugin-react-hooks eslint-plugin-react-refresh concurrently tsx @playwright/test@^1.63.0 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom supertest @types/express @types/node @types/react @types/react-dom @types/supertest @vitejs/plugin-react vite@^8.2.2
```

Expected: `package-lock.json` se crea y `npm ls --depth=0` termina sin errores.

- [x] **Step 3: Crear configuración estricta de TypeScript y ESLint**

`tsconfig.base.json` debe activar `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch` y `noEmitOnError`. Cada workspace extiende la base; shared y backend generan declaraciones/JavaScript en `dist`, mientras frontend usa `moduleResolution: "Bundler"` y `noEmit`.

`eslint.config.js` debe incluir JavaScript recomendado, reglas TypeScript con información de tipos, globals de navegador/Node según carpeta y hooks de React. Ignorar únicamente `dist`, `coverage`, `playwright-report` y `test-results`.

- [x] **Step 4: Escribir primero la prueba fallida de contratos**

```ts
import { describe, expect, it } from 'vitest';
import { GAME_RULES, isGameAction } from './index.js';

describe('shared game contracts', () => {
  it('publishes the fixed exam rules', () => {
    expect(GAME_RULES).toEqual({ boardSize: 7, maxRounds: 10, actionsPerTurn: 2, cargoCapacity: 3 });
  });

  it('accepts only supported action payloads', () => {
    expect(isGameAction({ type: 'MOVE', payload: { row: 5, column: 1 } })).toBe(true);
    expect(isGameAction({ type: 'DELETE_GAME' })).toBe(false);
  });
});
```

- [x] **Step 5: Ejecutar la prueba para comprobar que falla**

Run: `npm run test -w @mercado/shared -- --run`

Expected: FAIL porque `GAME_RULES` e `isGameAction` todavía no existen.

- [x] **Step 6: Implementar los contratos compartidos mínimos**

Usar estas uniones exactas:

```ts
export type ActorId = 'PLAYER' | 'AI';
export type GamePhase = 'PLAYER_TURN' | 'RESOLVING_AI' | 'FINISHED';
export type Tide = 'LOW' | 'RISING' | 'HIGH' | 'FALLING';
export type Good = 'FISH' | 'SPICE' | 'PEARL';
export type TileKind = 'SEA' | 'ISLAND' | 'REEF' | 'SUPPLY_PORT' | 'MARKET_PORT';
export type Position = Readonly<{ row: number; column: number }>;
export type GameAction =
  | Readonly<{ type: 'MOVE'; payload: Position }>
  | Readonly<{ type: 'LOAD' }>
  | Readonly<{ type: 'SELL'; payload: { good: Good } }>
  | Readonly<{ type: 'END_TURN' }>;

export const GAME_RULES = Object.freeze({
  boardSize: 7,
  maxRounds: 10,
  actionsPerTurn: 2,
  cargoCapacity: 3,
});
```

Definir el resto del contrato con estas formas:

```ts
export type PlayerState = Readonly<{
  id: ActorId;
  kind: 'HUMAN' | 'BOT';
  name: string;
  position: Position;
  coins: number;
  cargo: readonly Good[];
  cargoCapacity: number;
}>;

export type Tile = Readonly<{
  position: Position;
  kind: TileKind;
  supplyGood?: Good;
}>;

export type SupplyState = Readonly<{
  position: Position;
  good: Good;
  stock: number;
}>;

export type PriceState = Readonly<Record<Good, number>>;
export type DemandState = Readonly<Record<Good, number>>;

export type GameResult = Readonly<{
  kind: 'PLAYER_WIN' | 'AI_WIN' | 'DRAW';
  playerCoins: number;
  aiCoins: number;
}>;

export type GameEvent =
  | Readonly<{ type: 'GAME_STARTED'; round: number; message: string }>
  | Readonly<{ type: 'MOVED'; round: number; actor: ActorId; from: Position; to: Position; message: string }>
  | Readonly<{ type: 'LOADED'; round: number; actor: ActorId; good: Good; message: string }>
  | Readonly<{ type: 'SOLD'; round: number; actor: ActorId; good: Good; coins: number; message: string }>
  | Readonly<{ type: 'TURN_ENDED'; round: number; actor: ActorId; message: string }>
  | Readonly<{ type: 'TIDE_CHANGED'; round: number; tide: Tide; message: string }>
  | Readonly<{ type: 'RESTOCKED'; round: number; good: Good; position: Position; message: string }>
  | Readonly<{ type: 'ACTION_REJECTED'; round: number; actor: ActorId; code: string; message: string }>
  | Readonly<{ type: 'GAME_FINISHED'; round: number; result: GameResult; message: string }>;

export type GameState = Readonly<{
  id: string;
  seed: number;
  board: readonly Tile[];
  round: number;
  tide: Tide;
  phase: GamePhase;
  activeActor: ActorId;
  actionPoints: number;
  players: Readonly<Record<ActorId, PlayerState>>;
  supplies: readonly SupplyState[];
  prices: PriceState;
  demand: DemandState;
  result: GameResult | null;
  eventLog: readonly GameEvent[];
}>;

export type ApiError = Readonly<{ code: string; message: string }>;
export type CreateGameRequest = Readonly<{ playerName?: string; seed?: number }>;
export type GameResponse = Readonly<{ game: GameState }>;
export type ActionResponse = Readonly<{ game: GameState; newEvents: readonly GameEvent[] }>;
export type ErrorResponse = Readonly<{ error: ApiError; game?: GameState }>;
```

Implementar `isGameAction` como guardia exhaustiva de objetos, forma de payload, enteros y mercancías permitidas. `packages/shared/src/api.ts` contiene las formas HTTP; `game.ts` contiene dominio; `index.ts` reexporta ambas.

- [x] **Step 7: Ejecutar pruebas, tipos, lint y build**

Run: `npm run test -w @mercado/shared -- --run && npm run typecheck -w @mercado/shared && npm run lint && npm run build -w @mercado/shared`

Expected: todos los comandos PASS y `packages/shared/dist/index.js` existe.

**Registro de ejecución — 2026-09-13 (Task 1):**

- Runtime de verificación: Node 24.19.0 incluido en Codex; el Node del sistema sigue en 22.14.0.
- Ajuste mínimo de tooling: la instalación literal falló con `ERESOLVE` porque `typescript-eslint@8.70.0` requiere TypeScript `>=4.8.4 <6.1.0`. Se usa `typescript: ~6.0.3`; se mantienen la spec y los contratos aprobados. No se forzaron peers. Referencia: https://typescript-eslint.io/users/dependency-versions/.
- Instalaciones de React/React DOM, Express y herramientas completadas; `npm ls --depth=0` PASS y auditoría de instalación con 0 vulnerabilidades.
- Rojo: `npm run test -w @mercado/shared -- --run` terminó con código 1 por ausencia de `./index.js`, antes de crear la implementación.
- Verde: el mismo comando pasó con 46 pruebas, incluyendo las indicadas y casos de forma inválida para las cuatro acciones.
- Refactor: revisión de responsabilidades y duplicación; no fue necesario cambiar comportamiento después del verde.
- Verificación: `npm run typecheck -w @mercado/shared`, `npm run lint` y `npm run build -w @mercado/shared` terminaron con código 0.
- Checkpoint completado: el usuario confirmó el commit manual `c1f9c7b` antes de autorizar Task 2.
- [x] **Step 8: Detenerse para revisión y commit manual**

Entregar resumen y evidencia. Mensaje sugerido: `chore: scaffold monorepo and shared contracts`. No ejecutar comandos Git de escritura.

---

### Task 2: Generador sembrado, mapa fijo y estado inicial

**Files:**
- Create: `apps/backend/src/domain/random.ts`
- Create: `apps/backend/src/domain/board.ts`
- Create: `apps/backend/src/domain/create-game.ts`
- Create: `apps/backend/tests/fixtures.ts`
- Test: `apps/backend/tests/create-game.test.ts`

**Interfaces:**
- Consumes: `GameState`, `Tile`, `Tide`, `Good` y `GAME_RULES` de `@mercado/shared`.
- Produces: `createSeededRandom(seed: number): RandomSource`, `createBoard(): readonly Tile[]` y `createGame(input: { id: string; playerName: string; seed: number }): GameState`.

- [x] **Step 1: Escribir pruebas fallidas de reproducibilidad y mapa**

```ts
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/domain/create-game.js';

describe('createGame', () => {
  it('creates the same variable state for the same seed', () => {
    const a = createGame({ id: 'a', playerName: 'Marina', seed: 1209 });
    const b = createGame({ id: 'b', playerName: 'Marina', seed: 1209 });
    expect({ tide: a.tide, supplies: a.supplies }).toEqual({ tide: b.tide, supplies: b.supplies });
  });

  it('creates a valid 7 by 7 starting state', () => {
    const game = createGame({ id: 'game-1', playerName: 'Marina', seed: 7 });
    expect(game.board).toHaveLength(49);
    expect(game.round).toBe(1);
    expect(game.phase).toBe('PLAYER_TURN');
    expect(game.actionPoints).toBe(2);
    expect(game.players.PLAYER.position).toEqual({ row: 6, column: 0 });
    expect(game.players.AI.position).toEqual({ row: 0, column: 6 });
  });
});
```

- [x] **Step 2: Ejecutar la prueba para comprobar que falla**

Run: `npm run test -w @mercado/backend -- --run tests/create-game.test.ts`

Expected: FAIL porque los módulos de dominio todavía no existen.

- [x] **Step 3: Implementar el generador pseudoaleatorio**

```ts
export interface RandomSource {
  next(): number;
  integer(min: number, max: number): number;
  pick<T>(values: readonly T[]): T;
}

export function createSeededRandom(seed: number): RandomSource {
  let state = (seed >>> 0) || 0x9e3779b9;
  const next = (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
  return {
    next,
    integer: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(values: readonly T[]) => values[Math.floor(next() * values.length)] as T,
  };
}
```

- [x] **Step 4: Implementar el fixture del tablero**

Usar exactamente este mapa, donde `M` es mercado, `F/S/P` son puertos, `R` arrecife, `I` isla y `W` mar:

```ts
export const TILE_LAYOUT = [
  'WWIWWWM',
  'WWWWWSW',
  'WWRRRWW',
  'WIWPWIW',
  'WWRRRWW',
  'WFWWWWW',
  'MWWWIWW',
] as const;
```

`createBoard` convierte las 49 letras en `Tile` y asigna `FISH`, `SPICE` y `PEARL` a sus puertos.

- [x] **Step 5: Implementar `createGame`**

Crear ambos jugadores, precios base `{ FISH: 3, SPICE: 5, PEARL: 7 }`, existencias sembradas entre 2 y 4, ciclo de marea con desplazamiento `seed % 4`, log inicial y todos los campos definidos en `GameState`. Normalizar el nombre vacío a `Capitana` y limitarlo a 30 caracteres.

- [x] **Step 6: Añadir pruebas de rangos y diferencias entre semillas**

Comprobar que toda existencia está entre 2 y 4 y que las semillas 7 y 8 difieren en marea, existencias o ambas. No afirmar que dos semillas arbitrarias siempre difieren en todos los campos.

- [x] **Step 7: Crear fixtures compartidos de backend**

`tests/fixtures.ts` exporta `gameAtPlayerStart()`, `gameWith(overrides: Partial<GameState>)`, `aiAtMarketWithCargo(cargo: readonly Good[])` y `aiAtSupplyPort(good: Good)`. Todos parten de `createGame({ id: 'test-game', playerName: 'Marina', seed: 1209 })`, copian estructuras anidadas en vez de mutarlas y permiten a las tasks 3–5 referirse a un estado válido.

- [x] **Step 8: Ejecutar verificación de la task**

Run: `npm run test -w @mercado/backend -- --run tests/create-game.test.ts && npm run typecheck -w @mercado/backend && npm run lint`

Expected: PASS.

**Registro de ejecución — 2026-09-13 (Task 2):**

- Base verificada: commit manual de Task 1 `c1f9c7b`, confirmado por el usuario; 46 pruebas de shared PASS con Node 24.19.0.
- Rojo inicial: `npm run test -w @mercado/backend -- --run tests/create-game.test.ts` terminó con código 1 porque faltaba `create-game.js`; implementación inicial: 19 pruebas PASS.
- Pruebas de rango y variabilidad: semillas 0, 1, 7, 8, 1209 y 4294967295; existencias enteras entre 2 y 4; semillas 7 y 8 con estado variable distinto.
- Ajuste mínimo diagnosticado y explicado: `%` devuelve restos negativos en JavaScript. Dos pruebas de semillas -1 y -5 recibieron una marea indefinida; se normalizó el índice con `((seed % 4) + 4) % 4`. Se conserva el ciclo aprobado para todas las semillas enteras; 29 pruebas PASS después de la corrección.
- Rojo de fixtures: fallo por ausencia de `fixtures.js`; verde después de implementarlos: 35 pruebas PASS.
- La suite comprueba el mapa exacto, conectividad y rutas alternativas en marea alta, secuencia xorshift32, estado inicial, nombres y copias independientes. Refactor: revisión de duplicación y responsabilidades sin añadir comportamiento.
- Verificación requerida: tests de backend (35 PASS), `npm run typecheck -w @mercado/backend` y `npm run lint`, todos con código 0. Revisión de código sin hallazgos importantes.
- `.gitignore` conserva el cambio previo del usuario; la spec permanece intacta. No se ejecutaron comandos Git de escritura ni se inició Task 3.
- Checkpoint completado: el usuario confirmó el commit manual `a37f985` antes de autorizar Task 3.
- [x] **Step 9: Detenerse para revisión y commit manual**

Mensaje sugerido: `feat: generate seeded game state and board`.

---

### Task 3: Validador y ejecución de acciones del jugador

**Files:**
- Create: `apps/backend/src/domain/errors.ts`
- Create: `apps/backend/src/domain/rules.ts`
- Test: `apps/backend/tests/rules.test.ts`

**Interfaces:**
- Consumes: `GameState`, `GameAction`, `GameEvent`.
- Produces: `RuleErrorCode`, `RuleResult`, `validateAction(game, actor, action)` y `applyAction(game, actor, action)`.

- [x] **Step 1: Escribir tabla de pruebas fallidas para movimientos**

```ts
it.each([
  [{ row: 6, column: 2 }, 'NOT_ADJACENT'],
  [{ row: 7, column: 0 }, 'OUT_OF_BOUNDS'],
])('rejects move to %o with %s', (position, code) => {
  const result = applyAction(gameAtPlayerStart(), 'PLAYER', { type: 'MOVE', payload: position });
  expect(result).toMatchObject({ ok: false, error: { code } });
});
```

Añadir casos separados para isla adyacente —posicionar primero al jugador en `(6,3)` y mover a `(6,4)`—, arrecife cerrado, casilla ocupada, turno incorrecto, cero puntos y partida finalizada.

- [x] **Step 2: Ejecutar los tests para confirmar el fallo**

Run: `npm run test -w @mercado/backend -- --run tests/rules.test.ts`

Expected: FAIL porque `applyAction` no existe.

- [x] **Step 3: Implementar errores y validación de movimiento**

```ts
export type RuleResult =
  | Readonly<{ ok: true; game: GameState; events: readonly GameEvent[] }>
  | Readonly<{ ok: false; error: { code: RuleErrorCode; message: string } }>;

export function isAdjacent(from: Position, to: Position): boolean {
  return Math.abs(from.row - to.row) + Math.abs(from.column - to.column) === 1;
}
```

Aplicar validaciones en este orden: fase/actor, puntos, límites, adyacencia, tile, regla de arrecife y ocupación. Los mensajes se escriben en español y permanecen centralizados por código.

- [x] **Step 4: Escribir pruebas fallidas para carga y venta**

Cubrir carga correcta, puerto vacío, bodega llena, carga fuera de puerto, venta correcta, venta fuera de mercado y venta de mercancía ausente. Cada rechazo debe conservar igualdad profunda con el estado anterior.

- [x] **Step 5: Implementar `LOAD` y `SELL` de forma inmutable**

`LOAD` decrementa una existencia, agrega una unidad y consume un punto. `SELL` elimina exactamente una unidad, suma `max(1, base + tideModifier - demandPenalty)`, incrementa la penalización de demanda y consume un punto.

- [x] **Step 6: Implementar `END_TURN` y log limitado**

`END_TURN` fija los puntos del actor en 0. Toda acción exitosa produce un `GameEvent`; la utilidad `appendEvents` conserva los 50 más recientes.

- [x] **Step 7: Ejecutar la suite enfocada y completa**

Run: `npm run test -w @mercado/backend -- --run tests/rules.test.ts && npm run test -w @mercado/backend -- --run && npm run typecheck -w @mercado/backend && npm run lint`

Expected: PASS.

**Registro de ejecución — 2026-09-14 (Task 3):**

- Base verificada: commit manual de Task 2 `a37f985`; el árbol estaba limpio antes de iniciar.
- Rojo de movimiento: la suite terminó con código 1 porque faltaba `rules.js`; verde posterior: 15 pruebas PASS.
- Rojo de carga y venta: 8 fallos esperados porque ambas acciones devolvían el estado sin cambios; verde posterior: 23 pruebas PASS.
- Rojo de fin de turno y límite del log: 2 fallos esperados por puntos sin descartar y 51 eventos; verde posterior: 25 pruebas PASS tras implementar `appendEvents`.
- Rojo de mensajes: 2 fallos porque carga y venta incluían `FISH`; se añadieron etiquetas españolas y la suite volvió a verde.
- Fallo de verificación diagnosticado: ESLint detectó tres casts literales innecesarios en el test. Se eliminaron sin cambiar producción y se repitió toda la verificación.
- Verificación final requerida: 25 pruebas enfocadas PASS, 60 pruebas de backend PASS, typecheck PASS y lint PASS, todos con código 0 usando Node 24.19.0.
- No se ejecutaron comandos Git de escritura ni se inició Task 4.
- Pendiente: revisión humana y commit manual de Task 3.

- [ ] **Step 8: Detenerse para revisión y commit manual**

Mensaje sugerido: `feat: validate and apply player actions`.

---

### Task 4: Rondas, mareas, mercado, reposición y resultado

**Files:**
- Create: `apps/backend/src/domain/market.ts`
- Create: `apps/backend/src/domain/turns.ts`
- Test: `apps/backend/tests/turns.test.ts`

**Interfaces:**
- Consumes: `GameState`, `RandomSource`.
- Produces: `getSalePrice(game, good)`, `advanceAfterAiTurn(game)` y `finishGame(game)`.

- [ ] **Step 1: Escribir pruebas fallidas de precios**

```ts
it.each([
  ['LOW', 'FISH', 5],
  ['RISING', 'SPICE', 6],
  ['HIGH', 'PEARL', 9],
  ['FALLING', 'SPICE', 6],
] as const)('prices %s %s at %i before demand', (tide, good, expected) => {
  expect(getSalePrice(gameWith({ tide }), good)).toBe(expected);
});
```

Añadir prueba del mínimo 1 después de penalizaciones repetidas.

- [ ] **Step 2: Escribir pruebas fallidas del cambio de ronda**

Comprobar reinicio a 2 puntos, avance del ciclo de marea, reinicio de demanda, reposición determinista y cambio a `FINISHED` después del turno de IA en ronda 10.

- [ ] **Step 3: Ejecutar para confirmar el fallo**

Run: `npm run test -w @mercado/backend -- --run tests/turns.test.ts`

Expected: FAIL por módulos inexistentes.

- [ ] **Step 4: Implementar cálculo de precios y avance de ronda**

```ts
const TIDES = ['LOW', 'RISING', 'HIGH', 'FALLING'] as const;
const BASE_PRICES = { FISH: 3, SPICE: 5, PEARL: 7 } as const;
const TIDE_BONUS = {
  LOW: { FISH: 2, SPICE: 0, PEARL: 0 },
  RISING: { FISH: 0, SPICE: 1, PEARL: 0 },
  HIGH: { FISH: 0, SPICE: 0, PEARL: 2 },
  FALLING: { FISH: 0, SPICE: 1, PEARL: 0 },
} as const;
```

`advanceAfterAiTurn` termina la partida si `round === 10`; de lo contrario incrementa ronda, avanza la marea, reinicia demanda y crea `createSeededRandom(game.seed + game.round * 101)` para escoger de forma reproducible el puerto que repone una unidad. Devuelve `PLAYER_TURN` con 2 puntos.

- [ ] **Step 5: Implementar resultado exacto**

`finishGame` compara únicamente `players.PLAYER.coins` y `players.AI.coins`, crea `PLAYER_WIN`, `AI_WIN` o `DRAW` y añade un evento `GAME_FINISHED`.

- [ ] **Step 6: Ejecutar verificación de la task**

Run: `npm run test -w @mercado/backend -- --run tests/turns.test.ts && npm run test -w @mercado/backend -- --run && npm run typecheck -w @mercado/backend && npm run lint`

Expected: PASS.

- [ ] **Step 7: Detenerse para revisión y commit manual**

Mensaje sugerido: `feat: process tides rounds market and results`.

---

### Task 5: Estrategia heurística y orquestador del juego

**Files:**
- Create: `apps/backend/src/ai/score.ts`
- Create: `apps/backend/src/ai/strategy.ts`
- Create: `apps/backend/src/domain/game-engine.ts`
- Test: `apps/backend/tests/strategy.test.ts`
- Test: `apps/backend/tests/game-engine.test.ts`

**Interfaces:**
- Consumes: `validateAction`, `applyAction`, `advanceAfterAiTurn` y `createSeededRandom`.
- Produces: `scoreAction(game, action): number`, `chooseAiAction(game): GameAction` y `dispatchPlayerAction(game, action): RuleResult`.

- [ ] **Step 1: Escribir pruebas fallidas de prioridades de IA**

```ts
it('sells the most valuable cargo when already at market', () => {
  const game = aiAtMarketWithCargo(['FISH', 'PEARL']);
  expect(chooseAiAction(game)).toEqual({ type: 'SELL', payload: { good: 'PEARL' } });
});

it('loads when a profitable supply is under the ship', () => {
  const game = aiAtSupplyPort('SPICE');
  expect(chooseAiAction(game)).toEqual({ type: 'LOAD' });
});
```

Añadir casos de movimiento hacia objetivo, evitar casilla inválida, desempate reproducible y `END_TURN` cuando no hay movimiento posible.

- [ ] **Step 2: Ejecutar para confirmar el fallo**

Run: `npm run test -w @mercado/backend -- --run tests/strategy.test.ts`

Expected: FAIL porque la estrategia no existe.

- [ ] **Step 3: Implementar puntuación explicable**

Usar una suma estable: venta inmediata `100 + precio`; carga `70 + precio esperado`; movimiento `50 - distancia al mejor objetivo`; bloqueo útil `+3`; riesgo de quedar sobre arrecife antes de marea no alta `-20`; `END_TURN` `-100`. Enumerar solo acciones aceptadas por `validateAction`.

- [ ] **Step 4: Implementar elección y desempate sembrado**

Ordenar por puntuación descendente, reunir empates y elegir con `createSeededRandom(game.seed + game.round * 1_000 + game.actionPoints)`. La función devuelve una acción, no muta el estado y no conoce Express.

- [ ] **Step 5: Escribir pruebas fallidas del orquestador**

Comprobar que una primera acción del jugador deja 1 punto y no ejecuta IA; la segunda cambia a IA, ejecuta hasta dos acciones, avanza la ronda y devuelve todos los eventos. Comprobar que un rechazo no ejecuta IA.

- [ ] **Step 6: Implementar `dispatchPlayerAction`**

Aplicar la acción mediante `applyAction`. Si quedan puntos, devolver. Si no, cambiar a `RESOLVING_AI`, elegir/aplicar hasta dos acciones válidas o `END_TURN`, llamar a `advanceAfterAiTurn` y concatenar eventos sin superar el límite de 50.

- [ ] **Step 7: Ejecutar pruebas de IA y motor**

Run: `npm run test -w @mercado/backend -- --run tests/strategy.test.ts tests/game-engine.test.ts && npm run test -w @mercado/backend -- --run && npm run typecheck -w @mercado/backend && npm run lint`

Expected: PASS.

- [ ] **Step 8: Detenerse para revisión y commit manual**

Mensaje sugerido: `feat: add backend rival strategy and game engine`.

---

### Task 6: Almacenamiento en memoria y API Express

**Files:**
- Create: `apps/backend/src/game-store.ts`
- Create: `apps/backend/src/http/parse-action.ts`
- Create: `apps/backend/src/http/game-routes.ts`
- Create: `apps/backend/src/app.ts`
- Test: `apps/backend/tests/game-store.test.ts`
- Test: `apps/backend/tests/api.test.ts`

**Interfaces:**
- Consumes: `createGame`, `dispatchPlayerAction`, `GameState`, `GameAction`, `isGameAction`.
- Produces: `GameStore`, `createGameStore()`, `createApp(options?: { store?: GameStore })` y rutas REST bajo `/api`.

- [ ] **Step 1: Escribir prueba fallida del store**

```ts
it('creates and retrieves independent games', () => {
  const store = createGameStore();
  const game = store.create({ playerName: 'Marina', seed: 1209 });
  expect(store.get(game.id)).toEqual(game);
  expect(store.get('missing')).toBeUndefined();
});
```

- [ ] **Step 2: Implementar `GameStore`**

Usar un `Map<string, GameState>` privado. `create` usa `crypto.randomUUID()`, `get` devuelve el estado o `undefined`, y `save` reemplaza el valor por id. No exportar el `Map` ni añadir persistencia.

- [ ] **Step 3: Escribir pruebas HTTP fallidas**

```ts
it('creates, reads and advances a game through JSON', async () => {
  const app = createApp();
  const created = await request(app)
    .post('/api/games')
    .send({ playerName: 'Marina', seed: 1209 })
    .expect(201)
    .expect('Content-Type', /json/);
  const id = created.body.game.id as string;
  await request(app).get(`/api/games/${id}`).expect(200);
  await request(app)
    .post(`/api/games/${id}/actions`)
    .send({ type: 'MOVE', payload: { row: 6, column: 1 } })
    .expect(200);
});
```

Añadir casos de nombre inválido `400`, acción mal formada `400`, id ausente `404`, acción incompatible `409` y `/api/health` `200`.

- [ ] **Step 4: Ejecutar para comprobar el fallo**

Run: `npm run test -w @mercado/backend -- --run tests/api.test.ts`

Expected: FAIL porque `createApp` todavía no existe.

- [ ] **Step 5: Implementar parser de solicitudes**

`parseCreateGameBody` acepta objeto, `playerName?: string` y `seed?: integer`; limita el nombre a 30 caracteres. `parseActionBody` delega la forma en `isGameAction`. Ambos devuelven un resultado discriminado y nunca confían en casts directos de `req.body`.

- [ ] **Step 6: Implementar rutas y códigos HTTP**

```ts
router.post('/games', createGameHandler);
router.get('/games/:gameId', getGameHandler);
router.post('/games/:gameId/actions', actionHandler);
router.get('/health', healthHandler);
```

La acción exitosa guarda el nuevo estado y responde `{ game, newEvents }`. Los errores usan `{ error: { code, message }, game? }`; el middleware final transforma fallos inesperados a `500 INTERNAL_ERROR` sin stack.

- [ ] **Step 7: Exponer commit en health para verificar Render**

La respuesta debe ser:

```ts
res.json({
  status: 'ok',
  commit: process.env.RENDER_GIT_COMMIT ?? 'local',
});
```

- [ ] **Step 8: Ejecutar verificación de API**

Run: `npm run test -w @mercado/backend -- --run tests/game-store.test.ts tests/api.test.ts && npm run test -w @mercado/backend -- --run && npm run typecheck -w @mercado/backend && npm run lint`

Expected: PASS.

- [ ] **Step 9: Detenerse para revisión y commit manual**

Mensaje sugerido: `feat: expose authoritative game REST API`.

---

### Task 7: Servidor de producción, Vite y un solo origen

**Files:**
- Create: `apps/backend/src/server.ts`
- Create: `apps/backend/tests/static-serving.test.ts`
- Create: `apps/frontend/index.html`
- Create: `apps/frontend/vite.config.ts`
- Create: `apps/frontend/src/main.tsx`
- Create: `apps/frontend/src/App.tsx`
- Modify: `apps/backend/src/app.ts`
- Modify: root and workspace `package.json` scripts

**Interfaces:**
- Consumes: `createApp()`.
- Produces: proceso HTTP que escucha `PORT`, proxy Vite `/api` y fallback estático de SPA que nunca captura `/api/*`.

- [ ] **Step 1: Escribir prueba fallida de archivos estáticos**

Crear un directorio temporal con `index.html`, pasar su ruta a `createApp({ frontendDist })` y comprobar `GET /` `200 text/html`; comprobar que `GET /api/missing` sigue respondiendo JSON `404`.

- [ ] **Step 2: Ejecutar para confirmar el fallo**

Run: `npm run test -w @mercado/backend -- --run tests/static-serving.test.ts`

Expected: FAIL porque `frontendDist` y el fallback no están implementados.

- [ ] **Step 3: Implementar servicio estático seguro**

Después de registrar rutas `/api`, usar `express.static(frontendDist)` y un fallback GET no API que envíe `index.html`. Si el directorio no existe en desarrollo o pruebas sin fixture, no registrar el servicio estático.

- [ ] **Step 4: Crear entrada del servidor**

```ts
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const app = createApp();
app.listen(port, '0.0.0.0', () => {
  console.log(`Mercado de Mareas listening on ${port}`);
});
```

Resolver el dist de frontend desde `import.meta.url`, sin depender del directorio de trabajo.

- [ ] **Step 5: Configurar Vite y shell React**

`vite.config.ts` usa `@vitejs/plugin-react`, puerto 5173 y proxy `/api` a `http://localhost:3000`. `App.tsx` comienza con un encabezado `Mercado de Mareas` y una región `main`; todavía no contiene reglas.

- [ ] **Step 6: Configurar builds y comprobar un solo origen**

El build raíz compila shared, frontend y backend en ese orden. Ejecutar:

```powershell
npm run build
$env:PORT=3000; npm start
```

En otra terminal: `Invoke-WebRequest http://localhost:3000/api/health` y `Invoke-WebRequest http://localhost:3000/`. Expected: ambos `200` desde el puerto 3000. Terminar el proceso después de la comprobación.

- [ ] **Step 7: Ejecutar todas las verificaciones**

Run: `npm run test -w @mercado/backend -- --run && npm run typecheck && npm run lint && npm run build`

Expected: PASS.

- [ ] **Step 8: Detenerse para revisión y commit manual**

Mensaje sugerido: `feat: serve frontend and API from one Express origin`.

---

### Task 8: Cliente `fetch` y controlador de estado React

**Files:**
- Create: `apps/frontend/src/api/game-api.ts`
- Create: `apps/frontend/src/hooks/useGame.ts`
- Create: `apps/frontend/tests/game-api.test.ts`
- Create: `apps/frontend/tests/useGame.test.tsx`
- Create: `apps/frontend/tests/fixtures.ts`
- Create: `apps/frontend/tests/setup.ts`

**Interfaces:**
- Consumes: `GameState`, `GameAction`, respuestas y errores compartidos.
- Produces: `gameApi.createGame`, `gameApi.getGame`, `gameApi.sendAction` y hook `useGame()`.

- [ ] **Step 1: Configurar Vitest con jsdom**

Añadir al `vite.config.ts` el bloque `test` con `environment: 'jsdom'`, `setupFiles: './tests/setup.ts'` y restauración de mocks. `setup.ts` importa `@testing-library/jest-dom/vitest`.

- [ ] **Step 2: Escribir pruebas fallidas del cliente HTTP**

Crear antes `tests/fixtures.ts` con `createGameFixture(overrides: Partial<GameState> = {}): GameState`. Debe devolver un tablero de 49 casillas y todos los campos del contrato compartido; las pruebas de frontend solo modifican campos mediante `overrides`.

```ts
it('sends actions as JSON with native fetch', async () => {
  const game = createGameFixture();
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ game, newEvents: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  await gameApi.sendAction('game-1', { type: 'END_TURN' });
  expect(fetchMock).toHaveBeenCalledWith('/api/games/game-1/actions', expect.objectContaining({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'END_TURN' }),
  }));
});
```

Añadir respuestas `409` con `game` autoritativo y error de red.

- [ ] **Step 3: Ejecutar para confirmar el fallo**

Run: `npm run test -w @mercado/frontend -- --run tests/game-api.test.ts`

Expected: FAIL porque `gameApi` no existe.

- [ ] **Step 4: Implementar un único wrapper de `fetch`**

Crear `requestJson<T>(url, init)` que valida `response.ok`, parsea JSON una vez y lanza `GameApiError` con `status`, `code`, `message` y `game` opcional. No añadir Axios, caché, reintentos automáticos ni estado global.

- [ ] **Step 5: Escribir pruebas fallidas del hook**

Probar estados `idle`, `loading`, `playing`, `finished`; creación; recuperación desde `sessionStorage`; envío bloqueado mientras existe una promesa; actualización con el estado de un `409`; y reintento GET tras error de red.

- [ ] **Step 6: Implementar `useGame`**

La API pública del hook debe ser:

```ts
type UseGameResult = Readonly<{
  game: GameState | null;
  status: 'idle' | 'loading' | 'playing' | 'finished';
  error: string | null;
  isSubmitting: boolean;
  startGame(playerName: string): Promise<void>;
  sendAction(action: GameAction): Promise<void>;
  retry(): Promise<void>;
  restart(): void;
}>;
```

Persistir únicamente el id bajo `mercado-de-mareas.game-id`. `restart` elimina ese valor y vuelve a `idle`.

- [ ] **Step 7: Ejecutar verificación del cliente**

Run: `npm run test -w @mercado/frontend -- --run tests/game-api.test.ts tests/useGame.test.tsx && npm run typecheck -w @mercado/frontend && npm run lint`

Expected: PASS.

- [ ] **Step 8: Detenerse para revisión y commit manual**

Mensaje sugerido: `feat: connect React state to Express with fetch`.

---

### Task 9: Inicio, instrucciones y estructura de la partida

**Files:**
- Create: `apps/frontend/src/screens/HomeScreen.tsx`
- Create: `apps/frontend/src/screens/GameScreen.tsx`
- Create: `apps/frontend/src/components/StatusBar.tsx`
- Create: `apps/frontend/src/components/PlayerPanel.tsx`
- Create: `apps/frontend/src/styles/base.css`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/main.tsx`
- Test: `apps/frontend/tests/App.test.tsx`

**Interfaces:**
- Consumes: `useGame`, `GameState`.
- Produces: navegación por estado sin router y shell accesible de la partida.

- [ ] **Step 1: Escribir prueba fallida de inicio**

```tsx
it('starts a game and replaces the home screen with game status', async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(screen.getByRole('heading', { name: /mercado de mareas/i })).toBeVisible();
  expect(screen.getByText(/dos puntos de acción/i)).toBeVisible();
  await user.type(screen.getByLabelText(/nombre del capitán/i), 'Marina');
  await user.click(screen.getByRole('button', { name: /iniciar partida/i }));
  expect(await screen.findByText(/ronda 1 de 10/i)).toBeVisible();
});
```

Mockear el módulo `game-api`, no `fetch`, porque el cliente HTTP ya tiene su propia prueba.

- [ ] **Step 2: Ejecutar para comprobar el fallo**

Run: `npm run test -w @mercado/frontend -- --run tests/App.test.tsx`

Expected: FAIL por pantallas inexistentes.

- [ ] **Step 3: Implementar HomeScreen**

Incluir título, descripción, campo de nombre, botón de inicio e instrucciones visibles que enumeren objetivo, movimiento, carga, venta, mareas, 10 rondas, empate y acciones inválidas. El submit llama `startGame` y permanece desactivado durante carga.

- [ ] **Step 4: Implementar shell de GameScreen**

`StatusBar` muestra ronda, marea, turno y puntos. Dos `PlayerPanel` muestran monedas, posición, bodega y capacidad. Reservar regiones semánticas con headings para tablero, controles y bitácora; las tasks siguientes llenan esas regiones.

- [ ] **Step 5: Conectar App por estado**

`idle/loading` muestra inicio, `playing` muestra `GameScreen` y `finished` se delegará después a `ResultScreen`. No instalar router ni cambiar URL.

- [ ] **Step 6: Crear base CSS de pantalla completa**

Definir `min-height: 100dvh`, layout responsive, tipografía del sistema, variables de color, foco visible y ancho mínimo utilizable. Sin imágenes remotas ni dependencias de estilos.

- [ ] **Step 7: Ejecutar verificación de interfaz inicial**

Run: `npm run test -w @mercado/frontend -- --run tests/App.test.tsx && npm run typecheck -w @mercado/frontend && npm run lint && npm run build -w @mercado/frontend`

Expected: PASS.

- [ ] **Step 8: Detenerse para revisión y commit manual**

Mensaje sugerido: `feat: add game start instructions and status layout`.

---

### Task 10: Tablero, controles y acciones jugables

**Files:**
- Create: `apps/frontend/src/components/GameBoard.tsx`
- Create: `apps/frontend/src/components/ActionPanel.tsx`
- Create: `apps/frontend/src/components/EventLog.tsx`
- Create: `apps/frontend/src/styles/game.css`
- Modify: `apps/frontend/src/screens/GameScreen.tsx`
- Test: `apps/frontend/tests/GameScreen.test.tsx`

**Interfaces:**
- Consumes: `GameState`, `GameAction`, `sendAction`, `isSubmitting`.
- Produces: tablero CSS Grid 7 × 7 y emisión accesible de las cuatro acciones.

- [ ] **Step 1: Escribir prueba fallida de tablero y movimiento**

```tsx
it('renders 49 cells and sends a selected adjacent move', async () => {
  const user = userEvent.setup();
  const sendAction = vi.fn().mockResolvedValue(undefined);
  const gameAtStart = createGameFixture();
  render(<GameScreen game={gameAtStart} sendAction={sendAction} isSubmitting={false} />);
  expect(screen.getAllByRole('gridcell')).toHaveLength(49);
  await user.click(screen.getByRole('button', { name: /casilla 6, 1: mar/i }));
  expect(sendAction).toHaveBeenCalledWith({ type: 'MOVE', payload: { row: 6, column: 1 } });
});
```

- [ ] **Step 2: Escribir pruebas fallidas de carga, venta y fin de turno**

Renderizar fixtures del jugador sobre puerto de suministro y mercado. Verificar `LOAD`, selección de mercancía para `SELL`, `END_TURN` y desactivación de todos los botones mientras `isSubmitting`.

- [ ] **Step 3: Ejecutar para confirmar el fallo**

Run: `npm run test -w @mercado/frontend -- --run tests/GameScreen.test.tsx`

Expected: FAIL por componentes inexistentes.

- [ ] **Step 4: Implementar GameBoard semántico**

Usar `role="grid"`, 49 contenedores `role="gridcell"` y un botón por casilla. El nombre accesible sigue `Casilla {row}, {column}: {tipo}`. Representar jugador y rival con elementos de texto/símbolo dentro de la casilla y atributos `data-actor`; no codificar reglas de validez en el componente.

- [ ] **Step 5: Implementar ActionPanel**

Los botones `Cargar`, `Vender pescado`, `Vender especias`, `Vender perlas` y `Terminar turno` emiten objetos `GameAction`. Permanecen visibles durante el turno para permitir que Express demuestre una acción inválida; solo se desactivan por solicitud pendiente, fase no humana o partida terminada.

- [ ] **Step 6: Implementar EventLog y estilos del tablero**

El log usa `aria-live="polite"` y muestra los eventos recientes en español. CSS Grid usa `repeat(7, minmax(0, 1fr))`, relación cuadrada, clases por tile/marea, barcos posicionados y transición de `transform`/`opacity`. Incluir media query para tableta.

- [ ] **Step 7: Ejecutar pruebas y build**

Run: `npm run test -w @mercado/frontend -- --run tests/GameScreen.test.tsx && npm run test -w @mercado/frontend -- --run && npm run typecheck && npm run lint && npm run build`

Expected: PASS.

- [ ] **Step 8: Verificación manual del recorrido parcial**

Run: `npm run dev`. Abrir `http://localhost:5173`, iniciar partida, mover dos veces, cargar o provocar una carga inválida y terminar turno. Confirmar en Network que cada acción llama `/api/games/:id/actions` y devuelve JSON.

- [ ] **Step 9: Detenerse para revisión y commit manual**

Mensaje sugerido: `feat: render playable board and game controls`.

---

### Task 11: Errores visibles, resultado y accesibilidad

**Files:**
- Create: `apps/frontend/src/components/ErrorBanner.tsx`
- Create: `apps/frontend/src/screens/ResultScreen.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/screens/GameScreen.tsx`
- Modify: `apps/frontend/src/styles/base.css`
- Modify: `apps/frontend/src/styles/game.css`
- Test: `apps/frontend/tests/feedback.test.tsx`

**Interfaces:**
- Consumes: `error`, `retry`, `restart`, `GameResult`.
- Produces: recuperación de red, mensajes de reglas, pantalla final y experiencia compatible con movimiento reducido.

- [ ] **Step 1: Escribir pruebas fallidas de error y recuperación**

```tsx
it('announces a backend rule error without removing the board', async () => {
  const startPreparedGame = async (): Promise<void> => {
    await userEvent.click(screen.getByRole('button', { name: /iniciar partida/i }));
    await screen.findByText(/ronda 1 de 10/i);
  };
  render(<App />);
  await startPreparedGame();
  await userEvent.click(screen.getByRole('button', { name: /cargar/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/puerto de abastecimiento/i);
  expect(screen.getByRole('grid', { name: /tablero marítimo/i })).toBeVisible();
});
```

Añadir prueba de error de red con botón `Reintentar` y estado oficial conservado.

- [ ] **Step 2: Escribir prueba fallida de resultado**

Renderizar cada variante `PLAYER_WIN`, `AI_WIN` y `DRAW`; comprobar heading, monedas de ambos, resumen y botón `Jugar otra vez`.

- [ ] **Step 3: Ejecutar para comprobar el fallo**

Run: `npm run test -w @mercado/frontend -- --run tests/feedback.test.tsx`

Expected: FAIL por componentes inexistentes.

- [ ] **Step 4: Implementar ErrorBanner**

Usar `role="alert"`, mensaje textual, botón de reintento solo para error de red y botón de cierre para errores de regla. El cierre elimina únicamente el mensaje local, no el estado ni el id.

- [ ] **Step 5: Implementar ResultScreen y reinicio**

Mapear los tres resultados a textos inequívocos. Mostrar `Riqueza de {playerName}: N`, `Riqueza del rival: N`, hasta 10 eventos finales y botón que llama `restart`.

- [ ] **Step 6: Completar retroalimentación visual accesible**

Añadir foco `:focus-visible`, contraste suficiente, `aria-busy` durante solicitudes, `aria-current` para turno, transición de barcos y aparición de mercancías. Bajo `@media (prefers-reduced-motion: reduce)`, fijar duración de animaciones/transiciones a `0.01ms`. Añadir aviso no bloqueante bajo 720 px.

- [ ] **Step 7: Ejecutar verificación completa de frontend**

Run: `npm run test -w @mercado/frontend -- --run && npm run typecheck -w @mercado/frontend && npm run lint && npm run build -w @mercado/frontend`

Expected: PASS.

- [ ] **Step 8: Jugar manualmente una partida completa**

Run: `npm run dev`. Verificar inicio, instrucciones, movimiento, carga, venta, dos turnos de IA observables, cambio de marea, recurso repuesto, error de regla y resultado tras la ronda 10. Registrar cualquier defecto como fallo de esta task y corregirlo antes de avanzar.

- [ ] **Step 9: Detenerse para revisión y commit manual**

Mensaje sugerido: `feat: complete game feedback and result experience`.

---

### Task 12: Pruebas E2E locales y contra despliegue

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/game-flow.spec.ts`
- Create: `tests/e2e/invalid-action.spec.ts`
- Create: `tests/e2e/result.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: interfaz accesible y API real.
- Produces: `npm run e2e`, `npm run e2e:headed` y soporte para `BASE_URL` publicada.

- [ ] **Step 1: Configurar Playwright antes de escribir recorridos**

```ts
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'on-first-retry' },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm start',
        url: 'http://127.0.0.1:3000/api/health',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],
});
```

Fijar scripts raíz: `e2e` usa `--project=chromium`; `e2e:headed` usa `--project=chrome --headed`.

- [ ] **Step 2: Escribir E2E fallido de inicio y comunicación**

```ts
test('starts a game through the real Express API', async ({ page }) => {
  await page.goto('/');
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/games') && response.request().method() === 'POST',
  );
  await page.getByLabel(/nombre del capitán/i).fill('Marina');
  await page.getByRole('button', { name: /iniciar partida/i }).click();
  expect((await responsePromise).status()).toBe(201);
  await expect(page.getByText(/ronda 1 de 10/i)).toBeVisible();
  await expect(page.getByRole('gridcell')).toHaveCount(49);
});
```

- [ ] **Step 3: Escribir E2E de movimiento, carga y venta**

Desde la posición inicial: mover a `(6,1)` y `(5,1)`, cargar pescado, mover a `(5,0)` y `(6,0)`, vender pescado. Esperar cada respuesta POST, comprobar cambios de ronda y afirmar que las monedas aumentan. No usar `waitForTimeout`.

- [ ] **Step 4: Escribir E2E de acción inválida**

En el mercado inicial, pulsar `Cargar`; esperar `409`, comprobar el mensaje visible y confirmar que ronda, posición y puntos no cambiaron.

- [ ] **Step 5: Escribir E2E de finalización**

Iniciar una partida y pulsar `Terminar turno` una vez por ronda. Antes de cada click esperar que el botón esté habilitado; después verificar la siguiente ronda. Tras la décima respuesta, comprobar una pantalla con `Victoria`, `Derrota` o `Empate`, ambas riquezas y `Jugar otra vez`.

- [ ] **Step 6: Ejecutar y estabilizar headless**

Run: `npx playwright install chromium && npm run e2e`

Expected: tres archivos E2E PASS sin reintentos locales.

- [ ] **Step 7: Ejecutar visualmente en Chrome**

Run: `npm run e2e:headed`

Expected: Chrome visible ejecuta el mismo conjunto con API real. Si Chrome no está instalado, instalarlo antes de la defensa; no cambiar la prueba a una simulación.

- [ ] **Step 8: Detenerse para revisión y commit manual**

Mensaje sugerido: `test: cover published game flows with Playwright`.

---

### Task 13: Lint, E2E, deployment y Render

**Files:**
- Create: `.github/workflows/lint.yml`
- Create: `.github/workflows/e2e.yml`
- Create: `.github/workflows/deploy.yml`
- Create: `render.yaml`
- Modify: `apps/backend/tests/api.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `npm ci`, scripts raíz, `/api/health`, `RENDER_GIT_COMMIT`.
- Produces: tres checks separados y deploy verificable del SHA actual.

- [ ] **Step 1: Escribir comprobación fallida del SHA de health**

En `api.test.ts`, establecer temporalmente `process.env.RENDER_GIT_COMMIT = 'abc123'`, llamar `/api/health`, esperar `{ status: 'ok', commit: 'abc123' }` y restaurar el valor en `finally`.

- [ ] **Step 2: Verificar el contrato de health**

Run: `npm run test -w @mercado/backend -- --run tests/api.test.ts`

Expected: PASS con el endpoint implementado en Task 6. Si falla, restaurar exactamente `{ status: 'ok', commit: process.env.RENDER_GIT_COMMIT ?? 'local' }` antes de continuar.

- [ ] **Step 3: Crear workflow de lint**

```yaml
name: Lint
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
```

- [ ] **Step 4: Crear workflow de pruebas E2E**

```yaml
name: Tests and E2E
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    timeout-minutes: 20
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
          cache: npm
      - run: npm ci
      - run: npm run test
      - run: npx playwright install chromium --with-deps
      - run: npm run e2e
      - uses: actions/upload-artifact@v5
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

- [ ] **Step 5: Crear Blueprint de Render**

```yaml
services:
  - type: web
    name: mercado-de-mareas
    runtime: node
    plan: free
    buildCommand: npm ci && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    autoDeployTrigger: off
    envVars:
      - key: NODE_VERSION
        value: '24'
```

- [ ] **Step 6: Crear workflow de deployment con gate completo**

`deploy.yml` se activa en push a `main` y `workflow_dispatch`. Antes del hook repite `npm ci`, lint, tipos, unitarias, build y Playwright Chromium. Después:

```yaml
      - name: Trigger exact Render commit
        run: curl --fail --silent --show-error --request POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}&ref=${GITHUB_SHA}"
      - name: Wait for deployed commit
        env:
          PUBLIC_APP_URL: ${{ secrets.PUBLIC_APP_URL }}
        run: |
          for attempt in {1..60}; do
            response="$(curl --fail --silent "$PUBLIC_APP_URL/api/health" || true)"
            if echo "$response" | grep -q "$GITHUB_SHA"; then
              exit 0
            fi
            sleep 10
          done
          exit 1
      - name: Smoke test published app
        env:
          BASE_URL: ${{ secrets.PUBLIC_APP_URL }}
        run: npx playwright test tests/e2e/game-flow.spec.ts --project=chromium
```

El deploy hook de Render ya contiene su parámetro secreto de consulta; por eso se concatena `&ref=`. Configurar `timeout-minutes: 30` en el job para tolerar cold start y build gratuito.

- [ ] **Step 7: Validar localmente antes del primer push**

Run: `npm ci && npm run verify && npm run e2e`

Expected: PASS desde un checkout limpio equivalente y `git diff --check` sin errores.

- [ ] **Step 8: Detenerse para revisión, configuración externa y commits**

Mensaje sugerido: `ci: add lint e2e and Render deployment workflows`. El usuario hace el commit, crea/conecta el Web Service desde `render.yaml`, copia el deploy hook, configura `RENDER_DEPLOY_HOOK_URL` y `PUBLIC_APP_URL` en GitHub y realiza el primer push de control.

- [ ] **Step 9: Verificar el primer push de control**

El usuario confirma los tres workflows verdes y la URL. Ejecutar en PowerShell `$env:BASE_URL = Read-Host 'URL pública de Render'; npm run e2e:headed`. Expected: Chrome visible y pruebas PASS contra Render. No avanzar si un workflow o la URL falla.

---

### Task 14: Documentación final y ensayo de defensa

**Files:**
- Create: `README.md`
- Create: `docs/introduccion.md`
- Create: `docs/reglas.md`
- Create: `docs/api.md`
- Create: `docs/decisiones.md`
- Create: `docs/investigacion.md`
- Create: `docs/uso-ia.md`
- Create: `docs/defensa.md`
- Modify: documentation files when verification reveals a mismatch

**Interfaces:**
- Consumes: comandos, API, UI, CI y URL ya verificados.
- Produces: entregables escritos y guion reproducible de defensa/video.

- [ ] **Step 1: Escribir README desde evidencia ejecutable**

Incluir Node 24, `npm ci`, `npm run dev`, `npm run build`, `npm start`, `npm run test`, `npm run e2e`, `npm run e2e:headed`, arquitectura, endpoints JSON, `PORT`, secretos de GitHub y enlace real de Render. Probar cada comando antes de documentarlo.

- [ ] **Step 2: Documentar propósito y reglas**

`introduccion.md` cubre propósito, experiencia y jugadores. `reglas.md` cubre inicio, tablero, acciones, inválidos, mareas, estados, interacción, IA, victoria, empate y final. Comparar números y nombres con `GAME_RULES`.

- [ ] **Step 3: Documentar API con solicitudes verificadas**

`api.md` incluye los cuatro endpoints, métodos, códigos, entradas, respuestas completas y comandos `curl` ejecutables. Capturar los ejemplos desde una partida local real para evitar JSON ficticio.

- [ ] **Step 4: Documentar decisiones, riesgos y evolución**

`decisiones.md` explica monorepo, memoria de Express, motor puro, semilla, CSS Grid, ausencia de router/base de datos/Docker y los cambios relevantes de cada ciclo. Incluir riesgos y mitigaciones de la spec.

- [ ] **Step 5: Documentar investigación y fuentes**

`investigacion.md` describe Playwright headless/Chrome, GitHub Actions, Render Web Service, deploy hooks, health checks, puerto, variables, cold starts y limitaciones. Citar las páginas oficiales de Playwright, GitHub Actions y Render usadas en el plan.

- [ ] **Step 6: Completar registro de IA**

`uso-ia.md` usa una tabla con fecha, herramienta, solicitud, resultado incorporado, revisión humana y commit relacionado. Registrar diseño, plan y asistencia de implementación sin afirmar autoría humana exclusiva.

- [ ] **Step 7: Crear guion de video y defensa**

`defensa.md` divide el video de 3–5 minutos entre partida, solicitud JSON, E2E visual, Actions y URL. Añade checklist de 10 minutos: abrir credenciales, ejecutar E2E publicado, aplicar un cambio pequeño, correr lint/E2E, revisar Actions y confirmar deploy.

- [ ] **Step 8: Realizar auditoría contra los 100 puntos**

Crear una tabla en `README.md` que mapee las diez áreas de la rúbrica a archivo, prueba o pantalla concreta. Comprobar repositorio accesible, aplicación publicada, juego válido y condiciones de defensa antes de contar puntos.

- [ ] **Step 9: Ejecutar verificación final completa**

Run:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
$env:BASE_URL = Read-Host 'URL pública de Render'
npm run e2e:headed
```

Introducir la URL que el usuario haya configurado cuando PowerShell la solicite. Expected: todos los comandos PASS y Chrome visible contra el despliegue.

- [ ] **Step 10: Detenerse para revisión y segundo push**

Mensaje sugerido: `docs: finalize delivery and defense guide`. El usuario revisa documentación y aplicación, hace el commit final y ejecuta el segundo push antes del límite indicado por el examen.

---

## Execution Rules

1. Leer esta plan y la spec antes de cada task.
2. Ejecutar una sola task por ciclo.
3. Mantener rojo → verde → refactor; no escribir implementación antes de observar el fallo esperado.
4. No modificar el alcance de otra task para “adelantar trabajo”.
5. Ejecutar las verificaciones indicadas y reportar resultados reales.
6. Detenerse siempre en el checkpoint manual; el usuario revisa y hace el commit.
7. No ejecutar nunca `git add`, `git commit` ni `git push`.
8. Tras el commit confirmado por el usuario, continuar con la siguiente task.

## Sources Used for Tooling Decisions

- Playwright CI: <https://playwright.dev/docs/ci>
- Playwright browsers and Chrome channels: <https://playwright.dev/docs/browsers>
- GitHub Actions for Node.js: <https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs>
- Render deploy hooks: <https://render.com/docs/deploy-hooks>
- Render Node/Express deployment: <https://render.com/docs/deploy-node-express-app>
- Render Blueprint schema: <https://render.com/docs/blueprint-spec>
- Render health checks: <https://render.com/docs/health-checks>
- Render default environment variables: <https://render.com/docs/environment-variables>

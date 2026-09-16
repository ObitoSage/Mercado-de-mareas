# Graph Report - .  (2026-09-16)

## Corpus Check
- Corpus is ~36,714 words - fits in a single context window. You may not need a graph.

## Summary
- 376 nodes · 515 edges · 29 communities (27 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Motor y turnos|Motor y turnos]]
- [[_COMMUNITY_Componentes de juego|Componentes de juego]]
- [[_COMMUNITY_Contratos compartidos|Contratos compartidos]]
- [[_COMMUNITY_Estado y API React|Estado y API React]]
- [[_COMMUNITY_Puntuación y reglas|Puntuación y reglas]]
- [[_COMMUNITY_Diseño y reglas|Diseño y reglas]]
- [[_COMMUNITY_Dependencias de desarrollo|Dependencias de desarrollo]]
- [[_COMMUNITY_API y almacenamiento|API y almacenamiento]]
- [[_COMMUNITY_Scripts del monorepo|Scripts del monorepo]]
- [[_COMMUNITY_CI y despliegue|CI y despliegue]]
- [[_COMMUNITY_Paquete frontend|Paquete frontend]]
- [[_COMMUNITY_Paquete backend|Paquete backend]]
- [[_COMMUNITY_Compilación backend|Compilación backend]]
- [[_COMMUNITY_Compilación frontend|Compilación frontend]]
- [[_COMMUNITY_Paquete compartido|Paquete compartido]]
- [[_COMMUNITY_Compilación compartida|Compilación compartida]]
- [[_COMMUNITY_TypeScript E2E|TypeScript E2E]]
- [[_COMMUNITY_TypeScript base|TypeScript base]]
- [[_COMMUNITY_Proceso y defensa|Proceso y defensa]]
- [[_COMMUNITY_TypeScript pruebas backend|TypeScript pruebas backend]]
- [[_COMMUNITY_Estrategia E2E|Estrategia E2E]]
- [[_COMMUNITY_Entrada React|Entrada React]]

## God Nodes (most connected - your core abstractions)
1. `validateAction()` - 13 edges
2. `gameAtPlayerStart()` - 11 edges
3. `scripts` - 10 edges
4. `getSalePrice()` - 9 edges
5. `createGameFixture()` - 9 edges
6. `compilerOptions` - 9 edges
7. `usefulBlock()` - 8 edges
8. `scoreAction()` - 8 edges
9. `createSeededRandom()` - 8 edges
10. `applyAction()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `parseActionBody()` --calls--> `isGameAction()`  [INFERRED]
  apps/backend/src/http/parse-action.ts → packages/shared/src/game.ts
- `Three-to-five-minute video demonstration` --references--> `Verified deployment pipeline`  [EXTRACTED]
  docs/defensa.md → .github/workflows/deploy.yml
- `React SPA mount point` --implements--> `React Express shared-contract architecture`  [INFERRED]
  apps/frontend/index.html → README.md
- `reachablePositions()` --calls--> `key()`  [INFERRED]
  apps/backend/tests/create-game.test.ts → apps/backend/src/ai/score.ts
- `Pure game engine and shared contracts` --rationale_for--> `React Express shared-contract architecture`  [EXTRACTED]
  docs/decisiones.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Separated CI responsibilities** — workflows_lint_lint_pipeline, workflows_e2e_tests_and_e2e_pipeline, workflows_deploy_deploy_pipeline [EXTRACTED 1.00]
- **Authoritative full-state architecture** — readme_three_layer_architecture, docs_decisiones_express_source_of_truth, docs_api_gamestate_contract, specs_2026_09_12_mercado_de_mareas_design_full_state_data_flow [INFERRED 0.95]
- **Verified Render delivery flow** — render_render_blueprint, workflows_deploy_exact_commit_deployment, docs_api_health_endpoint, workflows_deploy_published_smoke_test [EXTRACTED 1.00]

## Communities (29 total, 2 thin omitted)

### Community 0 - "Motor y turnos"
Cohesion: 0.12
Nodes (25): chooseAiAction(), createBoard(), TILE_LAYOUT, TILE_TYPES, createGame(), TIDES, dispatchPlayerAction(), createSeededRandom() (+17 more)

### Community 1 - "Componentes de juego"
Cohesion: 0.07
Nodes (15): ActionPanel(), GOOD_SYMBOLS, SELL_ACTIONS, ErrorBannerProps, EventLog(), GOOD_LABELS, GOOD_SYMBOLS, GOOD_VISIBLE_LABELS (+7 more)

### Community 2 - "Contratos compartidos"
Cohesion: 0.09
Nodes (24): ActionResponse, ApiError, CreateGameRequest, ErrorResponse, GameResponse, ActorId, DemandState, GAME_RULES (+16 more)

### Community 3 - "Estado y API React"
Cohesion: 0.15
Nodes (11): gameApi, GameApiError, useGame(), UseGameResult, RESULT_COPY, ResultScreen(), App(), startPreparedGame() (+3 more)

### Community 4 - "Puntuación y reglas"
Cohesion: 0.18
Nodes (20): atPosition(), bestObjective(), distancesFrom(), key(), movementScore(), scoreAction(), usefulBlock(), RULE_ERROR_MESSAGES (+12 more)

### Community 5 - "Diseño y reglas"
Cohesion: 0.08
Nodes (25): POST /api/games/:gameId/actions, POST /api/games, ErrorResponse contract, GameState response contract, GET /api/games/:gameId, Express as source of truth, Minimal React UI state, Pure game engine and shared contracts (+17 more)

### Community 6 - "Dependencias de desarrollo"
Cohesion: 0.08
Nodes (24): devDependencies, concurrently, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom (+16 more)

### Community 7 - "API y almacenamiento"
Cohesion: 0.18
Nodes (11): createGameRoutes(), GAME_NOT_FOUND, presentGame(), parseActionBody(), parseCreateGameBody(), ParseResult, createApp(), createGameStore() (+3 more)

### Community 8 - "Scripts del monorepo"
Cohesion: 0.11
Nodes (17): engines, node, name, private, scripts, build, dev, e2e (+9 more)

### Community 9 - "CI y despliegue"
Cohesion: 0.14
Nodes (17): GET /api/health, npm workspaces monorepo, Single-origin deployment without Docker, GitHub Building and testing Node.js guidance, Render Blueprint specification, Render Deploy Hooks documentation, Render Node Web Service, Separated CI workflow responsibilities (+9 more)

### Community 10 - "Paquete frontend"
Cohesion: 0.13
Nodes (14): dependencies, @mercado/shared, react, react-dom, name, private, scripts, build (+6 more)

### Community 11 - "Paquete backend"
Cohesion: 0.14
Nodes (13): dependencies, express, @mercado/shared, name, private, scripts, build, dev (+5 more)

### Community 12 - "Compilación backend"
Cohesion: 0.17
Nodes (11): compilerOptions, declaration, lib, module, moduleResolution, outDir, rootDir, types (+3 more)

### Community 13 - "Compilación frontend"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck, types (+3 more)

### Community 14 - "Paquete compartido"
Cohesion: 0.17
Nodes (11): exports, import, name, private, scripts, build, test, typecheck (+3 more)

### Community 15 - "Compilación compartida"
Cohesion: 0.17
Nodes (11): compilerOptions, declaration, lib, module, moduleResolution, outDir, rootDir, types (+3 more)

### Community 16 - "TypeScript E2E"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, noEmit, skipLibCheck, strict, target, types (+1 more)

### Community 17 - "TypeScript base"
Cohesion: 0.20
Nodes (9): compilerOptions, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, noEmitOnError, noFallthroughCasesInSwitch, noUncheckedIndexedAccess, strict, target (+1 more)

### Community 18 - "Proceso y defensa"
Cohesion: 0.29
Nodes (7): TDD procedure for requested changes, Ten-minute defense walkthrough, AI-assisted development record, Human review and version-control ownership, Mercado de Mareas implementation plan, Task-by-task TDD checkpoint process, Mercado de Mareas system design

### Community 19 - "TypeScript pruebas backend"
Cohesion: 0.29
Nodes (6): compilerOptions, lib, noEmit, rootDir, extends, include

## Knowledge Gaps
- **182 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+177 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `parseActionBody()` connect `API y almacenamiento` to `Contratos compartidos`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `isGameAction()` connect `Contratos compartidos` to `API y almacenamiento`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dependencias de desarrollo` to `Scripts del monorepo`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _189 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Motor y turnos` be split into smaller, more focused modules?**
  _Cohesion score 0.12010796221322537 - nodes in this community are weakly interconnected._
- **Should `Componentes de juego` be split into smaller, more focused modules?**
  _Cohesion score 0.07096774193548387 - nodes in this community are weakly interconnected._
- **Should `Contratos compartidos` be split into smaller, more focused modules?**
  _Cohesion score 0.08994708994708994 - nodes in this community are weakly interconnected._
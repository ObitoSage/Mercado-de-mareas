# Registro de uso de IA

El desarrollo utilizó OpenAI Codex como asistencia para análisis, implementación guiada por pruebas, diagnóstico, documentación y verificación. El usuario aprobó la especificación y el plan, revisó los checkpoints y realizó manualmente todos los commits y pushes. Cada resultado generado se contrastó con pruebas, tipos, lint, build o ejecución real antes de incorporarlo.

| Fecha | Herramienta | Solicitud u objetivo | Resultado incorporado | Revisión humana y técnica | Commit relacionado |
| --- | --- | --- | --- | --- | --- |
| 2026-09-12 | OpenAI Codex | Convertir requisitos del examen en diseño SDD. | Especificación de arquitectura, reglas, API, UI, pruebas y despliegue. | Diseño leído y aprobado por el usuario antes de implementar. | Documento base previo a `c1f9c7b` |
| 2026-09-12 | OpenAI Codex | Crear plan ejecutable por tasks y checkpoints. | Plan de 14 tasks con contratos, TDD y comandos de verificación. | Plan aprobado; el usuario controló cada avance. | Documento base previo a `c1f9c7b` |
| 2026-09-13 | OpenAI Codex | Implementar monorepo y contratos con TDD. | Workspaces, TypeScript estricto, ESLint, tipos y guardia de acciones. | Rojo/verde observados; 46 pruebas shared y checks de tipos/lint/build. | `c1f9c7b` |
| 2026-09-13 | OpenAI Codex | Implementar generación sembrada y tablero. | PRNG, mapa fijo, estado inicial y fixtures. | Pruebas de reproducibilidad, rango, conectividad y semillas negativas; revisión del usuario. | `a37f985` |
| 2026-09-14 | OpenAI Codex | Implementar acciones, turnos y mercado. | Validador inmutable, precios, mareas, demanda, reposición y resultado. | Suites backend y diagnóstico de lint antes de los commits. | `522f14f`, `e5b3e2c` |
| 2026-09-14 | OpenAI Codex, modelos Sol/Astra según etapa | Implementar y revisar heurística del rival. | Puntuación explicable, búsqueda navegable, desempate sembrado y orquestador. | 29 pruebas enfocadas, 114 backend, tipos, lint y revisión independiente. | `f88fa51` |
| 2026-09-14 | OpenAI Codex | Crear API Express autoritativa. | Store en memoria, parsers, rutas, errores JSON y health. | TDD Supertest, 157 pruebas backend y revisión independiente. | `8f6db7e` |
| 2026-09-14 | OpenAI Codex | Integrar Express, Vite, `fetch` y React. | Un origen de producción, cliente HTTP y controlador de estado. | Smoke HTTP, pruebas del cliente/hook, tipos, lint y build. | `8157111` |
| 2026-09-14 | OpenAI Codex | Completar interfaz jugable y accesible. | Inicio, tablero, controles, bitácora, errores y resultado. | Pruebas de componentes y partida manual completa revisada. | `696fe14` |
| 2026-09-15 | OpenAI Codex, modelo Astra | Crear E2E locales y publicados. | Cuatro recorridos Playwright con API real y `BASE_URL`. | Chromium y Chrome visibles; revisión de cobertura y estabilidad. | `90a22c6` |
| 2026-09-15 | OpenAI Codex, modelo Astra | Automatizar CI/CD y Render. | Workflows Lint, Tests and E2E y Deploy; Blueprint y SHA en health. | Fallo remoto diagnosticado desde Actions; fix validado en checkout sin `dist`; tres workflows verdes y E2E publicado. | `b1a4ba0`, `9862a1b`, `fc44df1` |
| 2026-09-15 | OpenAI Codex | Preparar documentación y defensa. | README, reglas, API, decisiones, investigación, este registro y guion. | Contenido contrastado con código, API real, fuentes oficiales y gate final. | Pendiente del commit manual final |

La IA no realizó `git add`, `git commit` ni `git push`. Las decisiones finales, credenciales, publicación y control de versiones permanecieron bajo responsabilidad del usuario.


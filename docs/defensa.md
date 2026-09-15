# Guion de video y defensa

## Preparación

Ten abiertas estas páginas y terminales antes de grabar o comenzar la defensa:

1. Aplicación: <https://mercado-de-mareas.onrender.com>.
2. Health: <https://mercado-de-mareas.onrender.com/api/health>.
3. GitHub Actions: <https://github.com/ObitoSage/Mercado-de-mareas/actions>.
4. Editor en `apps/backend/src/domain` y `tests/e2e`.
5. Terminal en la raíz con Node 24 confirmado mediante `node --version`.

No muestres el valor de `RENDER_DEPLOY_HOOK_URL`, tokens, cookies ni pantallas de secretos.

## Video de 3 a 5 minutos

| Tiempo | Demostración | Explicación sugerida |
| --- | --- | --- |
| 0:00–0:30 | Abrir la URL y leer brevemente las instrucciones. | “Es un juego de comercio de diez rondas. React muestra el estado y Express conserva y valida la partida.” |
| 0:30–1:45 | Iniciar como Marina, mostrar 49 casillas, ronda, marea y riquezas; mover, cargar y vender. | “Cada acción viaja como JSON. Los recursos, precios, puntos y rival proceden de la respuesta del backend.” |
| 1:45–2:15 | Pulsar una acción inválida, por ejemplo `Cargar` fuera de un suministro. | “Express responde 409, conserva el estado oficial y React presenta el mensaje sin quitar el tablero.” |
| 2:15–2:50 | Mostrar una solicitud `/api/games/:id/actions` en Network o ejecutar el `curl` de `docs/api.md`. | “El frontend usa `fetch`; no replica las reglas ni actualiza el estado de forma optimista.” |
| 2:50–3:25 | Ejecutar `$env:BASE_URL='https://mercado-de-mareas.onrender.com'; npm run e2e:headed`. | “El mismo E2E usa Chrome visible y la API publicada, sin interceptaciones.” |
| 3:25–4:05 | Mostrar los tres workflows verdes y abrir Deploy. | “Lint, pruebas/E2E y deployment son checks separados. Deploy espera que health publique el SHA exacto antes del smoke.” |
| 4:05–4:30 | Abrir `/api/health` y el resultado de una partida. | “Frontend y backend viven en una URL. La partida termina después del turno rival de la ronda diez.” |

Si el video debe durar tres minutos, reduce la explicación del tablero y muestra solo un fragmento del E2E. No aceleres ni cortes la evidencia de la respuesta `409`, los checks verdes o la URL.

## Defensa de 10 minutos

### Minutos 0–2: arquitectura y estado

- Abre la aplicación y crea una partida.
- Señala que React llama `/api` con `fetch` y que Express guarda el `GameState` en memoria.
- Muestra `packages/shared/src/game.ts` para explicar el contrato común y `GAME_RULES`.

### Minutos 2–5: reglas e interacción

- Mueve el barco dos veces para mostrar el turno del rival y el cambio de ronda.
- Carga en `(5, 1)`, vuelve al mercado y vende pescado.
- Explica marea, demanda, stock limitado, ocupación de casillas y desempate sembrado.
- Provoca una carga inválida y enseña el `409` sin mutación.

### Minutos 5–7: API y pruebas

- Abre Network o usa un comando `curl` de `docs/api.md`.
- Ejecuta el E2E visible contra la URL publicada.
- Relaciona cada recorrido con inicio, acciones, rechazo y resultado.

### Minutos 7–9: CI y despliegue

- Abre los tres workflows y señala el último run verde.
- Explica que Deploy repite el gate, llama el hook con `GITHUB_SHA`, espera el SHA en `/api/health` y ejecuta el smoke publicado.
- Muestra `render.yaml` y la URL, sin abrir secretos.

### Minutos 9–10: cambio pequeño solicitado

Si el docente solicita un cambio, identifica primero el módulo responsable, escribe o modifica una prueba, observa el rojo, implementa el mínimo, vuelve a verde y ejecuta las verificaciones relevantes. No cambies la especificación ni hagas un push hasta tener todos los checks locales verdes.

## Checklist de diez minutos para un cambio

- [ ] Confirmar `node --version` → `v24.x`.
- [ ] Mantener abiertas y autenticadas GitHub y Render sin mostrar credenciales.
- [ ] Identificar una única responsabilidad y su prueba existente.
- [ ] Escribir la prueba del cambio y observar el fallo esperado.
- [ ] Implementar el ajuste mínimo y observar verde.
- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar la suite enfocada y `npm run e2e` si afecta el recorrido.
- [ ] Revisar `git diff --check` y `git status --short`.
- [ ] Revisar los tres workflows después del commit/push manual.
- [ ] Confirmar que `/api/health` muestra el nuevo SHA y ejecutar el E2E publicado.

## Comandos preparados

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
$env:BASE_URL='https://mercado-de-mareas.onrender.com'
npm run e2e:headed
```

Comprobación rápida de producción:

```powershell
Invoke-RestMethod 'https://mercado-de-mareas.onrender.com/api/health'
```

## Respuestas breves para preguntas previsibles

- **¿Por qué Express guarda el estado?** Para que el cliente no pueda decidir reglas ni desincronizar la partida; React representa la respuesta oficial.
- **¿Por qué no hay base de datos?** La versión aprobada conserva partidas únicamente durante la vida del proceso y no incluye cuentas ni persistencia.
- **¿Cómo es reproducible el juego?** La semilla alimenta un PRNG usado para marea inicial, stock, reposiciones y empates de la heurística.
- **¿Cómo se comprueba el deploy correcto?** `/api/health` devuelve `RENDER_GIT_COMMIT` y Actions espera que coincida con `GITHUB_SHA`.
- **¿Qué ocurre con un error de red?** React conserva el último estado conocido y ofrece volver a consultar la partida.
- **¿Qué ocurre con un 409?** Express adjunta el estado sin mutar y React muestra el mensaje del backend.


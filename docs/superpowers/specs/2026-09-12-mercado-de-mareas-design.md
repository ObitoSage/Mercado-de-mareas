# Mercado de Mareas — Especificación de diseño

**Fecha:** 2026-09-12  
**Estado:** Aprobado por el usuario el 2026-09-12  
**Tipo:** Diseño arquitectónico para desarrollo guiado por especificaciones (SDD)

## 1. Propósito

Construir y publicar un videojuego web por turnos en el que una persona compite contra una estrategia ejecutada por el backend. React representa el estado y captura las acciones; Express conserva el estado oficial, valida las reglas, resuelve las mareas y controla al rival.

La prioridad es entregar una aplicación válida, comprobable y fácil de modificar durante una defensa individual. El pulido visual se realizará únicamente después de asegurar reglas, API, pruebas, automatización, documentación y despliegue.

## 2. Alcance

La primera versión debe incluir:

- Pantalla de inicio, instrucciones visibles, partida completa y resultado.
- Tablero marítimo que aproveche significativamente el navegador.
- Un jugador humano contra un rival controlado por Express.
- Movimiento, carga, venta, bloqueo de casillas y competencia por recursos.
- Diez rondas con dos puntos de acción por participante y por turno.
- Mareas y mercancías variables, reproducibles mediante una semilla.
- API REST JSON consumida desde React exclusivamente mediante `fetch`.
- Estado oficial y lógica crítica en Express.
- Pruebas unitarias, de componentes, de integración HTTP y E2E.
- Tres workflows independientes: lint, E2E y deployment.
- Despliegue de frontend y backend en un único servicio de Render, sin Docker.
- Documentación y materiales de preparación para la defensa.

Quedan fuera del primer alcance:

- Multijugador entre dispositivos.
- Persistencia en base de datos o recuperación después de reiniciar el servidor.
- Autenticación, cuentas y clasificación global.
- Varios niveles de dificultad.
- Editor de mapas, campaña y sistema de logros.
- Bibliotecas de componentes, motores de juego o librerías para resolver las reglas.

## 3. Restricciones técnicas

- Frontend: React y TypeScript.
- Backend: Express y TypeScript.
- Construcción del frontend: Vite.
- Comunicación: API HTTP REST, JSON y `fetch` nativo.
- Interfaz: HTML semántico, CSS Grid y CSS propio.
- Gestión de paquetes: npm workspaces.
- Estado del servidor: memoria del proceso de Express.
- Producción: un solo dominio y puerto; Express sirve la API y el frontend compilado.
- Pruebas: Vitest, React Testing Library, Supertest y Playwright.
- No se usarán Bootstrap, Tailwind, Axios, React Router, Redux, motores de videojuegos, bibliotecas de componentes ni librerías externas para la lógica principal.
- Las dependencias de pruebas serán únicamente de desarrollo y no formarán parte del bundle de producción.

## 4. Concepto del juego

En *Mercado de Mareas*, dos comerciantes marítimos recorren un archipiélago para recoger pescado, especias y perlas y venderlos en puertos de mercado. Las mareas abren o cierran rutas por arrecifes, los recursos son limitados y cada venta modifica temporalmente los precios compartidos.

El jugador debe decidir entre rutas cortas y riesgosas, mercancías de distinto valor, regresar pronto a vender o intentar bloquear al rival. El rival evalúa las mismas oportunidades desde Express.

## 5. Reglas

### 5.1 Tablero

- El tablero tiene 7 filas y 7 columnas, indexadas desde `(0, 0)` hasta `(6, 6)`.
- El mapa es un fixture fijo y conectado compuesto por mar, islas, arrecifes, puertos de abastecimiento y puertos de mercado.
- Las islas nunca son navegables.
- Los arrecifes solo permiten entrada durante marea alta. Si una embarcación ya ocupa un arrecife cuando cambia la marea, puede abandonarlo, pero ninguna embarcación puede entrar hasta la siguiente marea alta.
- El puerto de mercado del rival se ubica en la zona superior derecha y el del jugador en la zona inferior izquierda.
- Existen al menos tres puertos de abastecimiento separados, uno por cada tipo de mercancía.
- El fixture final debe conservar al menos dos rutas posibles entre las zonas iniciales y los puertos para evitar un bloqueo total permanente.

### 5.2 Estado inicial

- Cada participante comienza sobre su puerto de mercado.
- Cada participante comienza con 0 monedas, bodega vacía, capacidad máxima de 3 unidades y 2 puntos de acción.
- El jugador tiene el primer turno de cada ronda.
- La partida comienza en la ronda 1 y termina después del turno del rival en la ronda 10.
- Express genera un identificador de partida y una semilla. Si el cliente no entrega una semilla, Express crea una.
- La semilla determina el punto inicial del ciclo de mareas, las existencias iniciales, las reposiciones y los desempates de la estrategia.

### 5.3 Mareas

El ciclo contiene `LOW`, `RISING`, `HIGH` y `FALLING`. La semilla selecciona el desplazamiento inicial y el ciclo avanza una posición al terminar cada ronda.

- Solo `HIGH` permite entrar en una casilla de arrecife.
- La marea actual se muestra permanentemente.
- El cambio de marea produce un evento visible y actualiza el aspecto de las casillas afectadas.
- Los precios base pueden recibir un modificador por marea: pescado `+2` en `LOW`, especias `+1` en `RISING` y `FALLING`, y perlas `+2` en `HIGH`.

### 5.4 Mercancías y mercado

- Tipos y precios base: pescado 3 monedas, especias 5 y perlas 7.
- Cada puerto de abastecimiento ofrece un único tipo de mercancía.
- La existencia inicial de cada puerto es un valor sembrado entre 2 y 4 unidades.
- Al terminar cada ronda, Express elige mediante la semilla un puerto cuya existencia sea menor que 4 y repone una unidad. Si todos están llenos, registra que no fue necesaria una reposición.
- Al iniciar una ronda, la demanda de cada mercancía comienza sin penalización.
- Cada unidad vendida reduce en 1 moneda el precio de esa mercancía durante el resto de la ronda, con un precio mínimo de 1.
- Solo las monedas obtenidas antes del final de la ronda 10 cuentan para la victoria; la mercancía restante no se liquida automáticamente.

### 5.5 Turnos y acciones

Cada participante dispone de 2 puntos de acción. Las acciones válidas son:

- `MOVE`: mueve el barco una casilla ortogonal y cuesta 1 punto.
- `LOAD`: carga una unidad del puerto ocupado y cuesta 1 punto.
- `SELL`: vende una unidad elegida de la bodega en un puerto de mercado y cuesta 1 punto.
- `END_TURN`: descarta los puntos restantes y no requiere carga útil.

Una acción aceptada se aplica inmediatamente. El jugador puede seguir actuando mientras conserve puntos. Al consumir el segundo punto o enviar `END_TURN`, Express ejecuta hasta dos acciones del rival y termina su turno. Después avanza la ronda, marea, precios y reposición, salvo que la ronda 10 haya terminado.

### 5.6 Interacción

- Dos barcos no pueden ocupar la misma casilla.
- La casilla ocupada por el rival bloquea el movimiento y puede forzar otra ruta.
- Ambos participantes consumen las mismas existencias limitadas.
- Las ventas modifican los precios disponibles para el participante que actúe después.
- No existen ataques ni eliminación de barcos; la competencia por posiciones, rutas, recursos y precios constituye la interacción principal.

### 5.7 Acciones inválidas

Express rechaza sin alterar el estado:

- Movimiento diagonal, no adyacente o fuera del tablero.
- Entrada en isla, arrecife cerrado o casilla ocupada.
- Carga fuera de un puerto, en un puerto vacío o con la bodega llena.
- Venta fuera de un mercado, de una mercancía ausente o sin puntos disponibles.
- Cualquier acción durante el turno del rival o después de finalizar.
- Acción con forma JSON desconocida o incompleta.

### 5.8 Finalización

- Después del turno del rival en la ronda 10, Express cambia la fase a `FINISHED`.
- Gana quien tenga más monedas.
- Si las monedas son iguales, el resultado es empate.
- La respuesta final incluye riqueza, ganador o empate y resumen de eventos.
- No se aceptan acciones posteriores, pero el estado final sigue disponible mediante GET mientras viva el proceso.

## 6. Estrategia del rival

La estrategia vive exclusivamente en el backend. En cada paso:

1. Enumera las acciones válidas desde el estado actual.
2. Prioriza vender cuando está en un mercado y posee mercancía rentable.
3. Prioriza cargar cuando está en un puerto con existencias y dispone de capacidad.
4. Si debe moverse, evalúa objetivos por valor esperado, distancia navegable, marea, capacidad restante y precio vigente.
5. Evita rutas que quedarían cerradas por el siguiente cambio de marea cuando existe una alternativa razonable.
6. Puede elegir una ruta que bloquee al jugador cuando su rentabilidad esperada no sea inferior a la mejor alternativa.
7. Utiliza el generador sembrado únicamente para desempatar opciones con la misma puntuación.

La estrategia debe devolver acciones ordinarias y someterse al mismo validador que el jugador. Nunca mutará el estado directamente ni recibirá permisos especiales.

## 7. Arquitectura

```text
mercado-de-mareas/
├── apps/
│   ├── frontend/          # React, Vite, componentes y cliente HTTP
│   └── backend/           # Express, almacenamiento, reglas y estrategia
├── packages/
│   └── shared/            # Contratos TypeScript de dominio y API
├── tests/
│   └── e2e/               # Playwright
├── docs/
│   ├── superpowers/
│   │   ├── specs/
│   │   └── plans/
│   ├── introduccion.md
│   ├── reglas.md
│   ├── api.md
│   ├── decisiones.md
│   ├── investigacion.md
│   └── uso-ia.md
├── .github/workflows/
└── package.json
```

### 7.1 Límites de responsabilidad

`apps/frontend`:

- Representa el estado recibido sin duplicar las reglas críticas.
- Captura acciones y las envía mediante `fetch`.
- Mantiene solo estado de interfaz: carga, error visible, pantalla activa y animación.
- Guarda el `gameId` en `sessionStorage` para recuperar la partida mediante GET después de recargar la página.
- No aplica actualizaciones optimistas del estado oficial.

`apps/backend`:

- Crea, conserva y recupera partidas en un `Map` en memoria.
- Valida comandos y aplica reglas.
- Controla turnos, rondas, mareas, precios, reposición, final y estrategia rival.
- Sirve JSON bajo `/api` y el frontend compilado en producción.
- Devuelve siempre errores de aplicación en JSON.

`packages/shared`:

- Define contratos serializables, uniones discriminadas y enumeraciones del dominio.
- No contiene lógica dependiente de React, Express, Node o el navegador.

El motor de reglas, el generador sembrado y la estrategia se implementan como módulos independientes con funciones puras siempre que sea posible.

## 8. Modelo de estado

El contrato compartido incluirá como mínimo:

- `GameState`: id, seed, board, round, tide, phase, activeActor, actionPoints, players, supplies, prices, result y eventLog.
- `PlayerState`: id, kind, position, coins, cargo y cargoCapacity.
- `Tile`: position y kind; los puertos incluyen su función y tipo de mercancía cuando corresponde.
- `GameAction`: unión discriminada de `MOVE`, `LOAD`, `SELL` y `END_TURN`.
- `GameEvent`: unión discriminada para movimientos, cargas, ventas, mareas, reposiciones, turnos, rechazos y resultado.
- `GameResult`: `PLAYER_WIN`, `AI_WIN` o `DRAW`, con monedas finales.

El registro conservará los 50 eventos más recientes para limitar el tamaño de las respuestas.

## 9. API REST

### `POST /api/games`

Entrada:

```json
{
  "playerName": "Marina",
  "seed": 1209
}
```

`playerName` y `seed` son opcionales. El nombre se normaliza y limita a 30 caracteres. Respuesta `201`:

```json
{
  "game": {
    "id": "uuid",
    "seed": 1209,
    "round": 1,
    "phase": "PLAYER_TURN",
    "actionPoints": 2
  }
}
```

El ejemplo está abreviado; la respuesta real contiene un `GameState` completo.

### `GET /api/games/:gameId`

Devuelve `200 { "game": GameState }` o `404` si la partida no existe.

### `POST /api/games/:gameId/actions`

Ejemplos de entrada:

```json
{ "type": "MOVE", "payload": { "row": 3, "column": 4 } }
```

```json
{ "type": "SELL", "payload": { "good": "PEARL" } }
```

Respuesta exitosa `200`:

```json
{
  "game": {},
  "newEvents": []
}
```

El objeto `game` contiene el estado completo y `newEvents` solo los eventos producidos por la solicitud.

### `GET /api/health`

Devuelve `200 { "status": "ok" }` para verificaciones locales, GitHub Actions y Render.

### Errores

Formato único:

```json
{
  "error": {
    "code": "TILE_OCCUPIED",
    "message": "No puedes avanzar: el rival ocupa esa casilla."
  },
  "game": {}
}
```

- `400`: JSON o parámetros inválidos.
- `404`: partida inexistente.
- `409`: acción válida en forma pero incompatible con el estado.
- `500`: fallo inesperado; no expone detalles internos.

La validación de entrada se implementará con funciones TypeScript propias para evitar una dependencia de validación innecesaria.

## 10. Interfaz

La aplicación será una experiencia de una sola página sin React Router.

- Inicio: título, nombre opcional, botón de partida e instrucciones visibles.
- Partida: encabezado de ronda y marea; tablero central; paneles de jugador y rival; controles contextuales; registro de eventos y mensajes.
- Resultado: victoria, derrota o empate, monedas, resumen y reinicio.

El tablero usa CSS Grid. Cada casilla es un elemento semántico identificable y cada barco se representa según el estado de React. El diseño prioriza escritorio y portátil para la defensa, permanece utilizable en tableta y muestra una advertencia no bloqueante cuando el ancho es demasiado reducido.

Los movimientos usan transiciones CSS; las cargas, ventas, reposiciones y cambios de marea reciben retroalimentación visual. `prefers-reduced-motion` desactiva desplazamientos no esenciales. Los controles incluyen nombres accesibles y estados `disabled` mientras existe una solicitud pendiente.

## 11. Flujo de datos

1. El usuario inicia o recupera una partida.
2. React solicita el estado a Express.
3. React deriva del estado qué controles mostrar o desactivar.
4. El usuario elige una acción.
5. React bloquea envíos duplicados y realiza un `fetch` JSON.
6. Express valida, aplica la acción y, si termina el turno, resuelve al rival.
7. Express devuelve el estado completo y los eventos nuevos.
8. React reemplaza su copia del estado y presenta los eventos.
9. Ante `409`, React conserva el estado autoritativo incluido en la respuesta y muestra el mensaje.
10. Ante un error de red o `500`, React mantiene el último estado conocido y ofrece reintentar la consulta GET.

## 12. Pruebas

### Unitarias y de componentes

- Generación reproducible con una misma semilla.
- Navegabilidad según casilla y marea.
- Costos, capacidad, existencias, precios y puntos de acción.
- Rechazo de cada familia de acción inválida sin mutación.
- Avance de turno, ronda, marea, reposición y final.
- Selección de acciones válidas por la heurística.
- Pantallas, controles, mensajes y resultado en React.

### Integración HTTP

- Creación y recuperación de partidas.
- Ejecución de acciones y turno del rival.
- Contratos JSON y códigos `400`, `404` y `409`.
- Servicio estático en modo de producción.

### E2E con Playwright

1. Crear una partida desde la pantalla inicial y ver tablero, marcador, ronda y marea.
2. Ejecutar movimiento, carga y venta y comprobar cambios procedentes del backend.
3. Provocar una acción inválida y comprobar que aparece el mensaje de Express.
4. Completar una partida sembrada y verificar victoria, derrota o empate.

Los E2E se ejecutan headless en CI y visualmente con Chrome durante la defensa. El conjunto admite una `BASE_URL` local o publicada; no intercepta ni reemplaza la API.

## 13. GitHub Actions y despliegue

Se crearán tres workflows separados:

- `lint.yml`: instalación reproducible, ESLint y comprobación TypeScript para todos los workspaces.
- `e2e.yml`: pruebas unitarias e integración, instalación de Chromium y Playwright headless.
- `deploy.yml`: activación del deploy hook de Render después de verificaciones exitosas en `main`, espera de `/api/health` y smoke test contra la URL publicada.

Render utilizará un único Web Service Node. El build compilará tipos compartidos, frontend y backend. El comando de inicio ejecutará Express, que escuchará `process.env.PORT` y servirá el directorio compilado del frontend. No se usará Docker.

GitHub almacenará `RENDER_DEPLOY_HOOK_URL` y `PUBLIC_APP_URL` como secretos. Ningún secreto se versionará.

## 14. Documentación y defensa

Antes de la entrega existirán:

- `README.md`: requisitos, instalación, ejecución, arquitectura, pruebas, API, variables y enlace publicado.
- `docs/introduccion.md`: propósito, experiencia, jugadores y alcance.
- `docs/reglas.md`: inicio, acciones, estados, estrategia, interacción y final.
- `docs/api.md`: endpoints, entradas, salidas y ejemplos JSON.
- `docs/decisiones.md`: decisiones técnicas, cambios relevantes, riesgos y mitigaciones.
- `docs/investigacion.md`: E2E, despliegue, servicio, puerto, variables, fuentes y limitaciones.
- `docs/uso-ia.md`: fecha, herramienta, objetivo, resultado y revisión humana de cada uso relevante.
- Guion de video de 3 a 5 minutos y lista de comprobación para la defensa de 10 minutos.

La arquitectura mantiene reglas, estrategia, mapa y textos en módulos pequeños para que un cambio solicitado por el docente pueda localizarse, probarse y desplegarse rápidamente.

## 15. Desarrollo por ciclos y control de versiones

Los ciclos previstos son:

1. Base del monorepo, herramientas y documentación inicial.
2. Contratos compartidos y motor de reglas con TDD.
3. Generación sembrada, mareas y mercancías.
4. Estrategia heurística.
5. Almacenamiento y API Express.
6. Cliente HTTP e interfaz React.
7. Flujo jugable completo y retroalimentación.
8. E2E y GitHub Actions.
9. Despliegue inicial y primer push de control.
10. Documentación final, endurecimiento, ensayo de defensa y segundo push.

El agente no realizará commits ni pushes. Después de cada tarea:

1. Implementará mediante TDD.
2. Ejecutará las verificaciones aplicables.
3. Presentará cambios, evidencia y mensaje sugerido de commit.
4. Se detendrá para revisión humana.
5. Continuará solo después de que el usuario confirme su commit manual.

## 16. Riesgos y mitigaciones

- **Pérdida del estado al reiniciar Render:** es una limitación aceptada; se documenta y la interfaz permite iniciar otra partida.
- **Cold start de Render:** `/api/health`, espera del workflow y mensajes de reintento reducen falsos fallos.
- **Heurística bloqueada:** siempre enumera acciones válidas y puede terminar el turno.
- **Mapa sin rutas:** el fixture se valida mediante una prueba de conectividad.
- **Pruebas inestables:** semilla fija, selectores accesibles y ausencia de tiempos arbitrarios.
- **Frontend duplicando reglas:** los controles son orientativos; Express vuelve a validar toda acción.
- **Tiempo de defensa:** comandos raíz, módulos pequeños, checklist y prueba visual ensayada.
- **Push final tardío:** un primer push prueba CI y Render con margen; el segundo publica la entrega final.

## 17. Criterios de aceptación

La especificación se considera implementada cuando:

- Se puede jugar una partida completa de 10 rondas contra el rival del backend.
- El tablero, barcos, marcador, controles, ronda, marea, recursos, errores y resultado son visibles.
- React actualiza el estado a partir de respuestas JSON obtenidas mediante `fetch`.
- Express crea partidas, guarda estado, valida acciones, procesa turnos, genera variabilidad y decide por el rival.
- Existen GET y POST funcionales relacionados con la partida.
- Una acción inválida se rechaza y se muestra sin corromper la partida.
- La aplicación completa funciona desde una sola URL y puerto.
- Lint, tipos, pruebas unitarias, integración y E2E pasan localmente.
- Los tres workflows producen resultados verificables.
- El E2E puede ejecutarse visualmente en Chrome contra la URL publicada.
- README, documentos obligatorios, registro de IA y preparación de defensa están completos.
- El usuario ha realizado los commits y los dos pushes de control dentro del plazo de evaluación.

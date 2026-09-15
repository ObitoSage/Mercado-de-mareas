# API REST

La API usa JSON bajo `/api`. En desarrollo local la base es `http://localhost:3000`; en producción es `https://mercado-de-mareas.onrender.com`. React consume estos endpoints mediante `fetch` nativo.

## Contratos de respuesta

Toda respuesta de partida incluye un `GameState` completo, nunca un parche. Sus campos son:

| Campo | Tipo y significado |
| --- | --- |
| `id` | UUID de la partida. |
| `seed` | Entero que reproduce marea, existencias, reposiciones y desempates. |
| `board` | 49 objetos `{ position: { row, column }, kind, supplyGood? }`. |
| `round` | Ronda actual, de 1 a 10. |
| `tide` | `LOW`, `RISING`, `HIGH` o `FALLING`. |
| `phase` | `PLAYER_TURN`, `RESOLVING_AI` o `FINISHED`. |
| `activeActor` | `PLAYER` o `AI`. |
| `actionPoints` | Puntos disponibles para el actor actual. |
| `players` | Estado completo de `PLAYER` y `AI`: nombre, posición, monedas, carga y capacidad. |
| `supplies` | Posición, mercancía y stock de cada puerto. |
| `prices` | Precios efectivos actuales de `FISH`, `SPICE` y `PEARL`. |
| `demand` | Penalización acumulada por mercancía durante la ronda. |
| `result` | `null` o resultado final con tipo y ambas riquezas. |
| `eventLog` | Hasta los 50 eventos más recientes. |

Las respuestas de error siguen este contrato completo:

```ts
type ErrorResponse = {
  error: { code: string; message: string };
  game?: GameState;
};
```

## Crear una partida

`POST /api/games`

`playerName` y `seed` son opcionales. El nombre se recorta, limita a 30 caracteres y un nombre vacío se convierte en `Capitana`. La semilla debe ser un entero.

```powershell
$baseUrl='http://localhost:3000'
$created=curl.exe --request POST "$baseUrl/api/games" `
  --header "Content-Type: application/json" `
  --data '{"playerName":"Marina","seed":1209}' | ConvertFrom-Json
$gameId=$created.game.id
$created | ConvertTo-Json -Depth 20
```

Respuesta `201`. Esta captura real muestra el objeto completo; el UUID cambia en cada creación:

```json
{
  "game": {
    "id": "cb748378-116b-4825-a39d-5ffd80331f62",
    "seed": 1209,
    "board": [
      {"position":{"row":0,"column":0},"kind":"SEA"},
      {"position":{"row":0,"column":1},"kind":"SEA"},
      {"position":{"row":0,"column":2},"kind":"ISLAND"},
      {"position":{"row":0,"column":3},"kind":"SEA"},
      {"position":{"row":0,"column":4},"kind":"SEA"},
      {"position":{"row":0,"column":5},"kind":"SEA"},
      {"position":{"row":0,"column":6},"kind":"MARKET_PORT"},
      {"position":{"row":1,"column":0},"kind":"SEA"},
      {"position":{"row":1,"column":1},"kind":"SEA"},
      {"position":{"row":1,"column":2},"kind":"SEA"},
      {"position":{"row":1,"column":3},"kind":"SEA"},
      {"position":{"row":1,"column":4},"kind":"SEA"},
      {"position":{"row":1,"column":5},"kind":"SUPPLY_PORT","supplyGood":"SPICE"},
      {"position":{"row":1,"column":6},"kind":"SEA"},
      {"position":{"row":2,"column":0},"kind":"SEA"},
      {"position":{"row":2,"column":1},"kind":"SEA"},
      {"position":{"row":2,"column":2},"kind":"REEF"},
      {"position":{"row":2,"column":3},"kind":"REEF"},
      {"position":{"row":2,"column":4},"kind":"REEF"},
      {"position":{"row":2,"column":5},"kind":"SEA"},
      {"position":{"row":2,"column":6},"kind":"SEA"},
      {"position":{"row":3,"column":0},"kind":"SEA"},
      {"position":{"row":3,"column":1},"kind":"ISLAND"},
      {"position":{"row":3,"column":2},"kind":"SEA"},
      {"position":{"row":3,"column":3},"kind":"SUPPLY_PORT","supplyGood":"PEARL"},
      {"position":{"row":3,"column":4},"kind":"SEA"},
      {"position":{"row":3,"column":5},"kind":"ISLAND"},
      {"position":{"row":3,"column":6},"kind":"SEA"},
      {"position":{"row":4,"column":0},"kind":"SEA"},
      {"position":{"row":4,"column":1},"kind":"SEA"},
      {"position":{"row":4,"column":2},"kind":"REEF"},
      {"position":{"row":4,"column":3},"kind":"REEF"},
      {"position":{"row":4,"column":4},"kind":"REEF"},
      {"position":{"row":4,"column":5},"kind":"SEA"},
      {"position":{"row":4,"column":6},"kind":"SEA"},
      {"position":{"row":5,"column":0},"kind":"SEA"},
      {"position":{"row":5,"column":1},"kind":"SUPPLY_PORT","supplyGood":"FISH"},
      {"position":{"row":5,"column":2},"kind":"SEA"},
      {"position":{"row":5,"column":3},"kind":"SEA"},
      {"position":{"row":5,"column":4},"kind":"SEA"},
      {"position":{"row":5,"column":5},"kind":"SEA"},
      {"position":{"row":5,"column":6},"kind":"SEA"},
      {"position":{"row":6,"column":0},"kind":"MARKET_PORT"},
      {"position":{"row":6,"column":1},"kind":"SEA"},
      {"position":{"row":6,"column":2},"kind":"SEA"},
      {"position":{"row":6,"column":3},"kind":"SEA"},
      {"position":{"row":6,"column":4},"kind":"ISLAND"},
      {"position":{"row":6,"column":5},"kind":"SEA"},
      {"position":{"row":6,"column":6},"kind":"SEA"}
    ],
    "round": 1,
    "tide": "RISING",
    "phase": "PLAYER_TURN",
    "activeActor": "PLAYER",
    "actionPoints": 2,
    "players": {
      "PLAYER": {"id":"PLAYER","kind":"HUMAN","name":"Marina","position":{"row":6,"column":0},"coins":0,"cargo":[],"cargoCapacity":3},
      "AI": {"id":"AI","kind":"BOT","name":"Rival","position":{"row":0,"column":6},"coins":0,"cargo":[],"cargoCapacity":3}
    },
    "supplies": [
      {"position":{"row":1,"column":5},"good":"SPICE","stock":2},
      {"position":{"row":3,"column":3},"good":"PEARL","stock":4},
      {"position":{"row":5,"column":1},"good":"FISH","stock":3}
    ],
    "prices": {"FISH":3,"SPICE":6,"PEARL":7},
    "demand": {"FISH":0,"SPICE":0,"PEARL":0},
    "result": null,
    "eventLog": [
      {"type":"GAME_STARTED","round":1,"message":"Comienza la partida. Es el turno de la capitana."}
    ]
  }
}
```

Errores posibles: `400 INVALID_REQUEST` para un cuerpo que no sea objeto, un nombre que no sea texto o una semilla no entera; `400 INVALID_JSON` para JSON ilegible.

## Recuperar una partida

`GET /api/games/:gameId`

```powershell
curl.exe "$baseUrl/api/games/$gameId"
```

Respuesta `200 { "game": GameState }`. `GameState` contiene todos los campos y las 49 casillas mostradas en la respuesta completa de creación, con los valores actuales. La captura local devolvió exactamente el mismo estado inicial.

Si el id no existe, responde `404`:

```json
{
  "error": {
    "code": "GAME_NOT_FOUND",
    "message": "La partida no existe."
  }
}
```

## Ejecutar una acción

`POST /api/games/:gameId/actions`

Formas aceptadas:

```json
{"type":"MOVE","payload":{"row":6,"column":1}}
```

```json
{"type":"LOAD"}
```

```json
{"type":"SELL","payload":{"good":"FISH"}}
```

```json
{"type":"END_TURN"}
```

Ejemplo ejecutable:

```powershell
curl.exe --request POST "$baseUrl/api/games/$gameId/actions" `
  --header "Content-Type: application/json" `
  --data '{"type":"MOVE","payload":{"row":6,"column":1}}'
```

La respuesta `200` sigue `{ "game": GameState, "newEvents": GameEvent[] }`. `game` vuelve a incluir el objeto completo y sus 49 casillas. En la captura real, el estado completo mostrado en la sección de creación cambió solamente en estos valores:

- `game.actionPoints`: `1`.
- `game.players.PLAYER.position`: `{ "row": 6, "column": 1 }`.
- `game.eventLog`: añadió el mismo evento `MOVED` incluido en `newEvents`.

El segundo campo de la respuesta real fue:

```json
{
  "newEvents": [
    {"type":"MOVED","round":1,"actor":"PLAYER","from":{"row":6,"column":0},"to":{"row":6,"column":1},"message":"Marina avanzó a la casilla 6, 1."}
  ]
}
```

Una acción con forma desconocida devuelve `400`:

```json
{
  "error": {
    "code": "INVALID_ACTION",
    "message": "La acción o su carga útil no son válidas."
  }
}
```

Una acción bien formada que contradice el estado devuelve `409` y adjunta el `GameState` completo sin mutarlo. La parte `error` de la captura real fue:

```json
{
  "error": {
    "code": "NOT_AT_SUPPLY_PORT",
    "message": "Debes estar en un puerto de abastecimiento para cargar."
  }
}
```

Junto a ese objeto, `game` contenía el mismo estado completo anterior al rechazo, conforme al contrato `ErrorResponse`.

Los códigos de regla incluyen `GAME_FINISHED`, `NOT_ACTIVE_ACTOR`, `NO_ACTION_POINTS`, `OUT_OF_BOUNDS`, `NOT_ADJACENT`, `TILE_BLOCKED`, `REEF_CLOSED`, `TILE_OCCUPIED`, `NOT_AT_SUPPLY_PORT`, `SUPPLY_EMPTY`, `CARGO_FULL`, `NOT_AT_MARKET` y `GOOD_NOT_IN_CARGO`.

## Salud

`GET /api/health`

```powershell
curl.exe "$baseUrl/api/health"
```

Respuesta local `200`:

```json
{"status":"ok","commit":"local"}
```

En Render, `commit` contiene `RENDER_GIT_COMMIT`. GitHub Actions compara ese valor con `GITHUB_SHA` antes del smoke publicado.

## Otros errores HTTP

- `400`: JSON, parámetros, tamaño o codificación inválidos.
- `404`: partida o ruta inexistente.
- `409`: acción reconocida que no se puede aplicar al estado actual.
- `500`: `{ "error": { "code": "INTERNAL_ERROR", "message": "Ocurrió un error interno." } }`; no expone stack ni detalles internos.

Los ejemplos se capturaron el 15 de septiembre de 2026 contra el servidor local construido, con semilla `1209`. Los UUID son efímeros y no deben reutilizarse después de reiniciar Express.

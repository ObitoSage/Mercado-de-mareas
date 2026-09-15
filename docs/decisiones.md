# Decisiones técnicas, riesgos y evolución

## Arquitectura elegida

### Monorepo con npm workspaces

`apps/frontend`, `apps/backend` y `packages/shared` se instalan con un único lockfile y comandos raíz. Esto permite que CI y la defensa ejecuten la misma secuencia y evita copiar contratos entre capas.

### Express como fuente oficial

El backend conserva cada `GameState` en un `Map`, valida todas las acciones, calcula precios, avanza mareas y rondas y decide por el rival. React reemplaza su copia con cada respuesta y solo conserva estado de interfaz. Esta separación permite demostrar mediante una respuesta `409` que una acción rechazada no corrompe la partida.

La memoria del proceso fue suficiente para el alcance de una partida sin cuentas. Una base de datos habría añadido migraciones, credenciales y recuperación que no forman parte de la especificación.

### Motor puro y contratos compartidos

Las reglas, el generador sembrado, el mercado, los turnos y la heurística son módulos independientes de HTTP. `packages/shared` contiene uniones discriminadas y constantes serializables. Express traduce solicitudes y React representa respuestas sin implementar otra versión de las reglas.

### Variabilidad reproducible

Un generador xorshift32 determina marea inicial, existencias, reposiciones y desempates. Una misma semilla reproduce las decisiones variables relevantes. Esto permite pruebas estables y explicar un recorrido concreto durante la defensa.

### React sin router ni gestor global

La aplicación tiene tres estados de pantalla: inicio, partida y resultado. No necesita rutas ni Redux. `useGame` centraliza creación, recuperación, envío, errores y reinicio; `sessionStorage` guarda solamente el id de la partida.

### CSS Grid y HTML semántico

El tablero fijo de 7 × 7 corresponde directamente a una cuadrícula CSS. Las 49 casillas mantienen roles accesibles, los controles tienen nombres y estados desactivados y la bitácora usa `aria-live`. CSS propio evita incorporar una biblioteca de componentes para una interfaz específica del juego.

### Un servicio, un origen y sin Docker

Vite compila los archivos estáticos y Express los sirve junto con `/api` desde el mismo puerto. Esto elimina CORS y reduce la configuración de despliegue. Render construye con Node 24 mediante `render.yaml`; Docker no aporta una necesidad adicional en este alcance.

## Evolución por ciclos

| Ciclo | Resultado incorporado | Commit de revisión humana |
| --- | --- | --- |
| Base | Workspaces, TypeScript estricto, lint y contratos compartidos. | `c1f9c7b` |
| Estado inicial | Mapa fijo, generador sembrado y fixtures. | `a37f985` |
| Reglas | Movimiento, carga, venta, fin de turno y errores inmutables. | `522f14f` |
| Rondas | Mareas, mercado, demanda, reposición y resultado. | `e5b3e2c` |
| Rival | Heurística explicable y orquestación del turno. | `f88fa51` |
| API | Store en memoria, parsers y rutas Express. | `8f6db7e` |
| Integración | Un origen, Vite, cliente `fetch` y hook React. | `8157111` |
| Experiencia | Inicio, tablero, controles, mensajes y resultado. | `696fe14` |
| E2E | Cuatro recorridos con API real, Chromium y Chrome. | `90a22c6` |
| CI/CD | Tres workflows, Blueprint Render y health con SHA. | `b1a4ba0`, `9862a1b`, `fc44df1` |

Cada ciclo siguió pruebas primero cuando introdujo comportamiento. Los fallos de entorno o integración se diagnosticaron antes de hacer el ajuste mínimo.

## Ajustes técnicos relevantes

- TypeScript se fijó en `~6.0.3` porque `typescript-eslint@8.70.0` declara compatibilidad inferior a TypeScript 6.1. Se mantuvo la configuración estricta.
- Los proyectos auxiliares de TypeScript separan las pruebas backend y Playwright para conservar lint con información de tipos.
- El script raíz de lint construye primero `@mercado/shared`, porque un checkout limpio no contiene su `dist` ignorado.
- `useGame` expone si un error permite reintento para distinguir red/500 de un rechazo de regla, sin trasladar reglas del dominio al navegador.
- La API proyecta precios efectivos calculados por el módulo de mercado; el store conserva la demanda y los precios base del estado.

## Riesgos y mitigaciones

| Riesgo | Consecuencia | Mitigación aplicada |
| --- | --- | --- |
| Reinicio de Render | Se pierden partidas activas. | Limitación documentada, recuperación solo mientras vive el proceso y botón para iniciar otra partida. |
| Arranque en frío | La primera solicitud puede tardar. | Health check, espera de hasta diez minutos en deployment y reintento visible en React. |
| Estrategia sin salida | El turno podría bloquearse. | Enumera acciones válidas y siempre puede elegir `END_TURN`. |
| Mapa sin rutas | Bloqueo permanente del juego. | Prueba de conectividad y rutas alternativas. |
| E2E inestable | Falsos fallos en CI/defensa. | Semillas fijas, selectores accesibles, esperas por respuestas/estado y sin tiempos arbitrarios. |
| Reglas duplicadas | React y Express podrían discrepar. | React emite intenciones; Express vuelve a validar y devuelve el estado completo. |
| Cambio durante defensa | Poco tiempo para localizar y comprobar. | Módulos pequeños, scripts raíz, TDD y checklist de diez minutos. |
| Push final tardío | Entrega sin publicar. | Primer push verificó CI/Render; el usuario controla el segundo push antes del corte. |


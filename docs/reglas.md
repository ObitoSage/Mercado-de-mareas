# Reglas de Mercado de Mareas

## Inicio y objetivo

La partida comienza en la ronda 1 con marea determinada por la semilla. La capitana inicia en `(6, 0)` y el rival en `(0, 6)`, ambos sobre un puerto de mercado. Cada uno empieza con 0 monedas, bodega vacía de capacidad 3 y 2 puntos de acción.

La partida termina después del turno del rival en la ronda 10. Gana quien tenga más monedas; una igualdad produce empate. La carga que permanezca en la bodega no se vende automáticamente.

Estos números proceden de `GAME_RULES`: tablero 7 × 7, diez rondas, dos acciones por turno y capacidad tres.

## Tablero

| Símbolo lógico | Casilla | Navegación |
| --- | --- | --- |
| `W` | Mar | Siempre navegable si está libre. |
| `I` | Isla | Nunca navegable. |
| `R` | Arrecife | Solo se puede entrar con marea `HIGH`. Se puede salir después del cambio. |
| `F` | Suministro de pescado `(5, 1)` | Permite cargar pescado si quedan unidades. |
| `S` | Suministro de especias `(1, 5)` | Permite cargar especias si quedan unidades. |
| `P` | Suministro de perlas `(3, 3)` | Permite cargar perlas si quedan unidades. |
| `M` | Mercado `(0, 6)` y `(6, 0)` | Permite vender cualquier mercancía disponible en la bodega. |

Dos barcos no pueden ocupar la misma casilla. La posición del rival bloquea el movimiento de la capitana y viceversa.

## Acciones

Cada acción aceptada consume un punto, excepto `END_TURN`, que descarta los puntos restantes:

- **Mover (`MOVE`):** avanza una casilla ortogonal. No permite diagonales, saltos ni salida del tablero.
- **Cargar (`LOAD`):** toma una unidad del puerto ocupado si existe stock y espacio en la bodega.
- **Vender (`SELL`):** vende una unidad elegida de la bodega al ocupar cualquiera de los mercados.
- **Terminar turno (`END_TURN`):** entrega el turno sin gastar las acciones restantes.

Al consumir el segundo punto o terminar el turno, Express ejecuta hasta dos acciones del rival. Después avanza la ronda, cambia la marea, reinicia la penalización de demanda y repone una unidad en un puerto elegible. Tras la ronda 10 cambia la fase a `FINISHED`.

## Mareas

El ciclo es `LOW → RISING → HIGH → FALLING → LOW`. La semilla elige el punto inicial y el ciclo avanza al terminar cada ronda.

| Marea | Efecto de navegación | Bonificación de venta |
| --- | --- | --- |
| `LOW` / Baja | No permite entrar en arrecifes. | Pescado `+2`. |
| `RISING` / Creciente | No permite entrar en arrecifes. | Especias `+1`. |
| `HIGH` / Alta | Permite entrar en arrecifes. | Perlas `+2`. |
| `FALLING` / Bajante | No permite entrar en arrecifes. | Especias `+1`. |

## Mercado y recursos

Los precios base son pescado 3, especias 5 y perlas 7 monedas. El precio efectivo es el precio base más la bonificación de marea menos la demanda acumulada, con mínimo 1.

Cada unidad vendida aumenta en uno la penalización de esa mercancía durante la ronda. La penalización vuelve a cero al iniciar la siguiente ronda. Los suministros comienzan con 2 a 4 unidades según la semilla; al terminar la ronda se repone una unidad en un puerto con menos de 4, también de forma sembrada.

## Acciones rechazadas

Express rechaza sin modificar la partida:

- movimientos fuera del tablero, diagonales o no adyacentes;
- entrada en isla, arrecife cerrado o casilla ocupada;
- carga fuera de un suministro, sin stock o con la bodega llena;
- venta fuera de mercado o de una mercancía ausente;
- acciones sin puntos, durante el turno incorrecto o después del final;
- JSON desconocido, incompleto o con tipos incorrectos.

Una acción bien formada pero incompatible devuelve HTTP `409` con el estado autoritativo. Una forma JSON inválida devuelve `400`. La interfaz presenta el mensaje del backend y conserva el tablero.

## Estrategia del rival

El rival enumera únicamente acciones aceptadas por el validador común. Prioriza vender en un mercado, luego cargar en un suministro rentable y después moverse hacia el mejor objetivo según valor esperado y distancia navegable. Considera la marea, el espacio de carga, el precio vigente, el riesgo de quedar en un arrecife y un bloqueo útil de la ruta humana. Los empates se resuelven con el generador sembrado. Si no existe una alternativa útil, termina el turno.

La estrategia devuelve una acción ordinaria; nunca altera el estado directamente ni recibe excepciones a las reglas.


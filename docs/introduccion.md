# Introducción

Mercado de Mareas es un videojuego web de estrategia y comercio para una persona. La persona controla a una capitana mercante y compite durante diez rondas contra un rival que toma sus decisiones en el backend.

El objetivo es terminar con más monedas. Para conseguirlas hay que navegar por un tablero marítimo de 7 × 7, cargar pescado, especias o perlas en puertos de abastecimiento y vender la carga en uno de los mercados. Cada participante dispone de dos puntos de acción por turno y una bodega de tres unidades.

La partida obliga a decidir entre rutas, mercancías y tiempo. Los arrecifes solo admiten entrada durante la marea alta; los recursos son compartidos y limitados; cada venta reduce temporalmente el precio de esa mercancía; y el otro barco ocupa y bloquea una casilla. La semilla de la partida hace reproducibles la marea inicial, las existencias, las reposiciones y los desempates del rival.

## Participantes

- **Capitana:** participante humano. Empieza en el mercado inferior izquierdo, actúa primero y envía sus decisiones desde React.
- **Rival:** bot controlado por Express. Empieza en el mercado superior derecho, usa las mismas acciones y pasa por el mismo validador que la capitana.

## Experiencia

La pantalla inicial explica las reglas y permite elegir un nombre. Durante la partida se muestran permanentemente ronda, marea, turno, puntos de acción, riquezas, bodegas, precios, existencias y una bitácora. Las acciones incompatibles se rechazan con el mensaje de Express sin reemplazar el estado válido. Después del turno rival de la ronda 10 aparece victoria, derrota o empate, las dos riquezas finales y la opción de comenzar otra partida.

## Alcance técnico

React representa el estado obtenido mediante `fetch`. Express crea y conserva la partida, valida todas las acciones, resuelve el mercado y ejecuta al rival. La aplicación publicada sirve frontend y API desde <https://mercado-de-mareas.onrender.com>.

Esta versión no incluye autenticación, base de datos, multijugador entre dispositivos, niveles de dificultad, campaña ni clasificación. Las partidas se conservan solamente mientras vive el proceso de Express.


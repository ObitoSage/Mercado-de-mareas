import type { GameResult, GameState } from '@mercado/shared';

const RESULT_COPY: Record<GameResult['kind'], Readonly<{ heading: string; summary: string }>> = {
  PLAYER_WIN: { heading: 'Victoria', summary: 'Tu comercio dominó las rutas antes de la última marea.' },
  AI_WIN: { heading: 'Derrota', summary: 'El rival reunió la mayor fortuna en esta travesía.' },
  DRAW: { heading: 'Empate', summary: 'Ambas tripulaciones terminaron con la misma riqueza.' },
};

export default function ResultScreen({ game, restart }: Readonly<{
  game: GameState;
  restart(): void;
}>) {
  const result = game.result;
  if (!result) return null;
  const copy = RESULT_COPY[result.kind];
  const finalEvents = game.eventLog.slice(-10).reverse();

  return (
    <main className={`result-shell result-shell--${result.kind.toLowerCase()}`}>
      <section className="result-card" aria-labelledby="result-title">
        <p className="eyebrow">Resultado final · Ronda {game.round}</p>
        <h1 id="result-title">{copy.heading}</h1>
        <p className="result-summary">{copy.summary}</p>
        <div className="wealth-summary">
          <p>Riqueza de {game.players.PLAYER.name}: {result.playerCoins}</p>
          <p>Riqueza del rival: {result.aiCoins}</p>
        </div>
        <button type="button" className="play-again" onClick={restart}>Jugar otra vez</button>
      </section>
      <section className="final-log" aria-labelledby="final-log-title">
        <h2 id="final-log-title">Últimos sucesos</h2>
        <ol>
          {finalEvents.map((event, index) => (
            <li key={`${event.round}-${event.type}-${game.eventLog.length - index}`}>
              <span>Ronda {event.round}</span>{event.message}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

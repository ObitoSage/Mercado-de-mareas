import { GAME_RULES, type GameState, type Tide } from '@mercado/shared';

const TIDE_LABELS: Record<Tide, string> = {
  LOW: 'Baja',
  RISING: 'Creciente',
  HIGH: 'Alta',
  FALLING: 'Bajante',
};

export default function StatusBar({ game }: Readonly<{ game: GameState }>) {
  const playerTurn = game.phase === 'PLAYER_TURN' && game.activeActor === 'PLAYER';
  return (
    <header className="status-bar">
      <div>
        <p className="eyebrow">Mercado de Mareas</p>
        <p className="round-label">Ronda {game.round} de {GAME_RULES.maxRounds}</p>
      </div>
      <dl className="status-facts">
        <div><dt>Marea</dt><dd>{TIDE_LABELS[game.tide]}</dd></div>
        <div aria-current={playerTurn ? 'true' : undefined}>
          <dt>Turno</dt><dd>{playerTurn ? game.players.PLAYER.name : 'Rival'}</dd>
        </div>
        <div><dt>Puntos de acción</dt><dd>{game.actionPoints}</dd></div>
      </dl>
    </header>
  );
}

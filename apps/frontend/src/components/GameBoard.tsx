import type { GameAction, GameState, Good, Tile } from '@mercado/shared';

const TILE_LABELS = {
  SEA: 'mar',
  ISLAND: 'isla',
  REEF: 'arrecife',
  SUPPLY_PORT: 'puerto de abastecimiento',
  MARKET_PORT: 'mercado',
} as const;
const GOOD_LABELS: Record<Good, string> = { FISH: 'pescado', SPICE: 'especias', PEARL: 'perlas' };
const GOOD_SYMBOLS: Record<Good, string> = { FISH: '🐟', SPICE: '✦', PEARL: '●' };

function tileLabel(tile: Tile): string {
  const base = TILE_LABELS[tile.kind];
  return tile.supplyGood ? `${base} de ${GOOD_LABELS[tile.supplyGood]}` : base;
}

export default function GameBoard({ game, disabled, onAction }: Readonly<{
  game: GameState;
  disabled: boolean;
  onAction(action: GameAction): void;
}>) {
  return (
    <div className="game-board" role="grid" aria-label="Tablero marítimo" data-tide={game.tide}>
      {game.board.map((tile) => {
        const playerHere = game.players.PLAYER.position.row === tile.position.row
          && game.players.PLAYER.position.column === tile.position.column;
        const aiHere = game.players.AI.position.row === tile.position.row
          && game.players.AI.position.column === tile.position.column;
        const supply = game.supplies.find(({ position }) =>
          position.row === tile.position.row && position.column === tile.position.column);
        const stockLabel = supply ? `, ${supply.stock} unidades disponibles` : '';
        const label = `Casilla ${tile.position.row}, ${tile.position.column}: ${tileLabel(tile)}${stockLabel}`;
        return (
          <div role="gridcell" className="board-cell" key={`${tile.position.row}-${tile.position.column}`}>
            <button
              type="button"
              className={`tile tile--${tile.kind.toLowerCase()}`}
              aria-label={label}
              disabled={disabled}
              onClick={() => onAction({ type: 'MOVE', payload: tile.position })}
            >
              <span className="tile-mark" aria-hidden="true">
                {tile.kind === 'MARKET_PORT' ? '⚓' : tile.supplyGood ? GOOD_SYMBOLS[tile.supplyGood] : ''}
              </span>
              {supply ? <span className="stock" aria-hidden="true">{supply.stock}</span> : null}
              <span className="ships" aria-hidden="true">
                {playerHere ? <span className="ship ship--player" data-actor="PLAYER">▲</span> : null}
                {aiHere ? <span className="ship ship--ai" data-actor="AI">◆</span> : null}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

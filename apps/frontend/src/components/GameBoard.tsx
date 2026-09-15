import type { GameAction, GameState, Good, Tide, Tile } from '@mercado/shared';

const TILE_LABELS = {
  SEA: 'mar',
  ISLAND: 'isla',
  REEF: 'arrecife',
  SUPPLY_PORT: 'puerto de abastecimiento',
  MARKET_PORT: 'mercado',
} as const;
const GOOD_LABELS: Record<Good, string> = { FISH: 'pescado', SPICE: 'especias', PEARL: 'perlas' };
const GOOD_VISIBLE_LABELS: Record<Good, string> = { FISH: 'Pescado', SPICE: 'Especias', PEARL: 'Perlas' };
const GOOD_SYMBOLS: Record<Good, string> = { FISH: '🐟', SPICE: '✦', PEARL: '●' };
const LABEL_BREAKS: Readonly<Record<string, number>> = {
  Arrecife: 4,
  Especias: 4,
  Mercado: 3,
  Perlas: 3,
  Pescado: 3,
};

function tileLabel(tile: Tile, tide: Tide): string {
  const base = TILE_LABELS[tile.kind];
  const supplyLabel = tile.supplyGood ? `${base} de ${GOOD_LABELS[tile.supplyGood]}` : base;
  if (tile.kind !== 'REEF') return supplyLabel;
  return `${supplyLabel}, ${tide === 'HIGH' ? 'navegable con marea alta' : 'bloqueado hasta la marea alta'}`;
}

function TileArtwork({ tile, tide }: Readonly<{ tile: Tile; tide: Tide }>) {
  if (tile.kind === 'ISLAND') {
    return (
      <span className="island-art" aria-hidden="true">
        <span className="island-land" />
        <span className="palm palm--one"><i /><b /></span>
        <span className="palm palm--two"><i /><b /></span>
      </span>
    );
  }

  if (tile.kind === 'REEF') {
    return (
      <span className="reef-art" aria-hidden="true">
        <span className="coral"><i /><i /><i /><i /></span>
        <span className="reef-gate">{tide === 'HIGH' ? 'Abierto' : 'Solo alta'}</span>
      </span>
    );
  }

  if (tile.kind === 'MARKET_PORT') {
    return (
      <span className="port-art market-art" aria-hidden="true">
        <span className="dock" />
        <span className="port-building"><i>⚓</i></span>
      </span>
    );
  }

  if (tile.kind === 'SUPPLY_PORT' && tile.supplyGood) {
    return (
      <span className="port-art supply-art" aria-hidden="true">
        <span className="dock" />
        <span className="port-building"><i>{GOOD_SYMBOLS[tile.supplyGood]}</i></span>
      </span>
    );
  }

  return <span className="sea-art" aria-hidden="true"><i /><i /></span>;
}

function Ship({ actor }: Readonly<{ actor: 'PLAYER' | 'AI' }>) {
  return (
    <span className={`ship ship--${actor === 'PLAYER' ? 'player' : 'ai'}`} data-actor={actor}>
      <i className="ship-mast" />
      <i className="ship-sail" />
      <i className="ship-hull" />
      <b>{actor === 'PLAYER' ? 'Tú' : 'Rival'}</b>
    </span>
  );
}

export default function GameBoard({ game, disabled, onAction }: Readonly<{
  game: GameState;
  disabled: boolean;
  onAction(action: GameAction): void;
}>) {
  return (
    <div className="board-map">
      <ul className="board-legend" aria-label="Leyenda del tablero">
        <li><span className="legend-symbol legend-symbol--sea" aria-hidden="true">≋</span>Mar navegable</li>
        <li><span className="legend-symbol legend-symbol--island" aria-hidden="true">♣</span>Isla bloqueada</li>
        <li><span className="legend-symbol legend-symbol--reef" aria-hidden="true">♒</span>Arrecife · solo marea alta</li>
        <li><span className="legend-symbol legend-symbol--supply" aria-hidden="true">▣</span>Abastecimiento</li>
        <li><span className="legend-symbol legend-symbol--market" aria-hidden="true">⚓</span>Mercado</li>
      </ul>
      <div className="board-frame">
        <span className="compass" aria-hidden="true"><i>✦</i>N</span>
        <div className="game-board" role="grid" aria-label="Tablero marítimo" data-tide={game.tide}>
          {game.board.map((tile) => {
            const playerHere = game.players.PLAYER.position.row === tile.position.row
              && game.players.PLAYER.position.column === tile.position.column;
            const aiHere = game.players.AI.position.row === tile.position.row
              && game.players.AI.position.column === tile.position.column;
            const supply = game.supplies.find(({ position }) =>
              position.row === tile.position.row && position.column === tile.position.column);
            const stockLabel = supply ? `, ${supply.stock} unidades disponibles` : '';
            const occupantLabel = playerHere
              ? ', contiene tu barco'
              : aiHere ? ', contiene el barco rival' : '';
            const label = `Casilla ${tile.position.row}, ${tile.position.column}: ${tileLabel(tile, game.tide)}${stockLabel}${occupantLabel}`;
            const visibleTileLabel = tile.supplyGood
              ? GOOD_VISIBLE_LABELS[tile.supplyGood]
              : tile.kind === 'SEA' ? null : TILE_LABELS[tile.kind].charAt(0).toUpperCase() + TILE_LABELS[tile.kind].slice(1);
            const labelBreak = visibleTileLabel ? LABEL_BREAKS[visibleTileLabel] : undefined;
            const goodClass = tile.supplyGood ? ` tile--good-${tile.supplyGood.toLowerCase()}` : '';

            return (
              <div role="gridcell" className="board-cell" key={`${tile.position.row}-${tile.position.column}`}>
                <button
                  type="button"
                  className={`tile tile--${tile.kind.toLowerCase()}${goodClass}`}
                  aria-label={label}
                  disabled={disabled}
                  onClick={() => onAction({ type: 'MOVE', payload: tile.position })}
                >
                  <TileArtwork tile={tile} tide={game.tide} />
                  {visibleTileLabel ? (
                    <span className="tile-name">
                      {labelBreak ? visibleTileLabel.slice(0, labelBreak) : visibleTileLabel}
                      {labelBreak ? <wbr /> : null}
                      {labelBreak ? visibleTileLabel.slice(labelBreak) : null}
                    </span>
                  ) : null}
                  {supply ? <span className="stock" aria-hidden="true"><small>x</small>{supply.stock}</span> : null}
                  <span className="ships" aria-hidden="true">
                    {playerHere ? <Ship actor="PLAYER" /> : null}
                    {aiHere ? <Ship actor="AI" /> : null}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import type { PlayerState } from '@mercado/shared';

const GOOD_LABELS = { FISH: 'Pescado', SPICE: 'Especias', PEARL: 'Perlas' } as const;

export default function PlayerPanel({ player, isActive }: Readonly<{
  player: PlayerState;
  isActive: boolean;
}>) {
  return (
    <article className="player-panel" aria-current={isActive ? 'true' : undefined}>
      <div className="player-heading">
        <p className="eyebrow">{player.kind === 'HUMAN' ? 'Tu navío' : 'Navío rival'}</p>
        <h2>{player.name}</h2>
      </div>
      <dl className="player-facts">
        <div><dt>Monedas</dt><dd>{player.coins}</dd></div>
        <div><dt>Posición</dt><dd>{player.position.row}, {player.position.column}</dd></div>
        <div><dt>Bodega</dt><dd>{player.cargo.length} / {player.cargoCapacity}</dd></div>
      </dl>
      <ul className="cargo-list" aria-label={`Carga de ${player.name}`}>
        {player.cargo.length === 0
          ? <li className="cargo-empty">Bodega vacía</li>
          : player.cargo.map((good, index) => <li key={`${good}-${index}`}>{GOOD_LABELS[good]}</li>)}
      </ul>
    </article>
  );
}

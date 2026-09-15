import type { GameAction, GameState, Good } from '@mercado/shared';

const SELL_ACTIONS: readonly Readonly<{ good: Good; label: string }>[] = [
  { good: 'FISH', label: 'Vender pescado' },
  { good: 'SPICE', label: 'Vender especias' },
  { good: 'PEARL', label: 'Vender perlas' },
];
const GOOD_SYMBOLS: Record<Good, string> = { FISH: '🐟', SPICE: '✦', PEARL: '●' };

export default function ActionPanel({ demand, disabled, onAction, prices }: Readonly<{
  demand: GameState['demand'];
  disabled: boolean;
  onAction(action: GameAction): void;
  prices: GameState['prices'];
}>) {
  return (
    <>
      <section className="market-panel" aria-labelledby="market-title">
        <p className="panel-kicker">Precios de hoy</p>
        <h3 id="market-title">Mercado</h3>
        <ul>
          <li><span className="good-icon" aria-hidden="true">{GOOD_SYMBOLS.FISH}</span>Pescado: {prices.FISH} monedas</li>
          <li><span className="good-icon" aria-hidden="true">{GOOD_SYMBOLS.SPICE}</span>Especias: {prices.SPICE} monedas</li>
          <li><span className="good-icon" aria-hidden="true">{GOOD_SYMBOLS.PEARL}</span>Perlas: {prices.PEARL} monedas</li>
        </ul>
        <p className="demand-note">Penalización de demanda: {demand.FISH} pescado, {demand.SPICE} especias, {demand.PEARL} perlas</p>
      </section>
      <div className="action-panel">
        <button type="button" disabled={disabled} onClick={() => onAction({ type: 'LOAD' })}>
          <span aria-hidden="true">▣</span>Cargar
        </button>
        {SELL_ACTIONS.map(({ good, label }) => (
          <button
            type="button"
            disabled={disabled}
            key={good}
            onClick={() => onAction({ type: 'SELL', payload: { good } })}
          >
            <span aria-hidden="true">{GOOD_SYMBOLS[good]}</span>{label}
          </button>
        ))}
        <button
          type="button"
          className="end-turn"
          disabled={disabled}
          onClick={() => onAction({ type: 'END_TURN' })}
        >
          <span aria-hidden="true">→</span>Terminar turno
        </button>
      </div>
    </>
  );
}

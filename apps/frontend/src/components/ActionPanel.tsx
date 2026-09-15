import type { GameAction, GameState, Good } from '@mercado/shared';

const SELL_ACTIONS: readonly Readonly<{ good: Good; label: string }>[] = [
  { good: 'FISH', label: 'Vender pescado' },
  { good: 'SPICE', label: 'Vender especias' },
  { good: 'PEARL', label: 'Vender perlas' },
];

export default function ActionPanel({ demand, disabled, onAction, prices }: Readonly<{
  demand: GameState['demand'];
  disabled: boolean;
  onAction(action: GameAction): void;
  prices: GameState['prices'];
}>) {
  return (
    <>
      <section className="market-panel" aria-labelledby="market-title">
        <h3 id="market-title">Mercado</h3>
        <ul>
          <li>Pescado: {prices.FISH} monedas</li>
          <li>Especias: {prices.SPICE} monedas</li>
          <li>Perlas: {prices.PEARL} monedas</li>
        </ul>
        <p>Penalización de demanda: {demand.FISH} pescado, {demand.SPICE} especias, {demand.PEARL} perlas</p>
      </section>
      <div className="action-panel">
        <button type="button" disabled={disabled} onClick={() => onAction({ type: 'LOAD' })}>Cargar</button>
        {SELL_ACTIONS.map(({ good, label }) => (
          <button
            type="button"
            disabled={disabled}
            key={good}
            onClick={() => onAction({ type: 'SELL', payload: { good } })}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="end-turn"
          disabled={disabled}
          onClick={() => onAction({ type: 'END_TURN' })}
        >
          Terminar turno
        </button>
      </div>
    </>
  );
}

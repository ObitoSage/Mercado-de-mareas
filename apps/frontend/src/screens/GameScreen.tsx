import type { GameAction, GameState } from '@mercado/shared';
import ActionPanel from '../components/ActionPanel';
import ErrorBanner from '../components/ErrorBanner';
import EventLog from '../components/EventLog';
import GameBoard from '../components/GameBoard';
import PlayerPanel from '../components/PlayerPanel';
import StatusBar from '../components/StatusBar';

export type GameScreenProps = Readonly<{
  game: GameState;
  canRetry?: boolean;
  error?: string | null;
  isSubmitting: boolean;
  onDismissError?(): void;
  retry?(): Promise<void>;
  sendAction(action: GameAction): Promise<void>;
}>;

export default function GameScreen({
  game,
  canRetry = false,
  error = null,
  isSubmitting,
  onDismissError = () => undefined,
  retry = () => Promise.resolve(),
  sendAction,
}: GameScreenProps) {
  const controlsDisabled = isSubmitting
    || game.phase !== 'PLAYER_TURN'
    || game.activeActor !== 'PLAYER';
  const handleAction = (action: GameAction) => { void sendAction(action); };

  return (
    <main className="game-shell" aria-busy={isSubmitting}>
      <StatusBar game={game} />
      {error ? (
        <div className="game-feedback">
          <ErrorBanner
            message={error}
            canRetry={canRetry}
            onDismiss={onDismissError}
            onRetry={() => { void retry(); }}
          />
        </div>
      ) : null}
      <p className="narrow-notice">Para navegar mejor el tablero, gira el dispositivo o usa una pantalla más ancha.</p>
      <section className="player-row" aria-label="Participantes">
        <PlayerPanel player={game.players.PLAYER} isActive={game.activeActor === 'PLAYER'} />
        <PlayerPanel player={game.players.AI} isActive={game.activeActor === 'AI'} />
      </section>
      <div className="game-layout">
        <section className="board-region" aria-labelledby="board-title">
          <h2 id="board-title">Tablero marítimo</h2>
          <GameBoard game={game} disabled={controlsDisabled} onAction={handleAction} />
        </section>
        <aside className="game-sidebar">
          <section aria-labelledby="actions-title">
            <h2 id="actions-title">Controles</h2>
            <ActionPanel
              demand={game.demand}
              disabled={controlsDisabled}
              onAction={handleAction}
              prices={game.prices}
            />
          </section>
          <section aria-labelledby="log-title">
            <h2 id="log-title">Bitácora</h2>
            <EventLog events={game.eventLog} />
          </section>
        </aside>
      </div>
    </main>
  );
}

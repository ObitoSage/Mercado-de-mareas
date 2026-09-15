import { useState } from 'react';
import type { GameAction } from '@mercado/shared';
import { useGame } from './hooks/useGame';
import GameScreen from './screens/GameScreen';
import HomeScreen from './screens/HomeScreen';
import ResultScreen from './screens/ResultScreen';

export default function App() {
  const { game, status, error, canRetry, isSubmitting, startGame, sendAction, retry, restart } = useGame();
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const visibleError = error === dismissedError ? null : error;

  const handleStart = (playerName: string) => {
    setDismissedError(null);
    return startGame(playerName);
  };
  const handleAction = (action: GameAction) => {
    setDismissedError(null);
    return sendAction(action);
  };
  const handleRetry = () => {
    setDismissedError(null);
    return retry();
  };

  if (status === 'finished' && game) {
    return <ResultScreen game={game} restart={restart} />;
  }

  if (status === 'playing' && game) {
    return (
      <GameScreen
        game={game}
        error={visibleError}
        canRetry={canRetry}
        isSubmitting={isSubmitting}
        onDismissError={() => { if (error) setDismissedError(error); }}
        retry={handleRetry}
        sendAction={handleAction}
      />
    );
  }

  return (
    <HomeScreen
      error={visibleError}
      canRetry={canRetry}
      isLoading={status === 'loading'}
      onDismissError={() => { if (error) setDismissedError(error); }}
      retry={handleRetry}
      startGame={handleStart}
    />
  );
}

import { useState, type FormEvent } from 'react';
import ErrorBanner from '../components/ErrorBanner';

type HomeScreenProps = Readonly<{
  error: string | null;
  canRetry: boolean;
  isLoading: boolean;
  onDismissError(): void;
  retry(): Promise<void>;
  startGame(playerName: string): Promise<void>;
}>;

export default function HomeScreen({ canRetry, error, isLoading, onDismissError, retry, startGame }: HomeScreenProps) {
  const [playerName, setPlayerName] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void startGame(playerName);
  };

  return (
    <main className="home-shell">
      <section className="home-hero" aria-labelledby="game-title">
        <p className="eyebrow">Comercio por turnos · 7 × 7</p>
        <h1 id="game-title">Mercado de Mareas</h1>
        <p className="home-summary">
          Navega entre puertos, comercia con tres mercancías y supera la riqueza del rival
          antes de que cambie la última marea.
        </p>
        <form className="start-form" onSubmit={handleSubmit} aria-busy={isLoading}>
          <label htmlFor="captain-name">Nombre del capitán</label>
          <input
            id="captain-name"
            name="playerName"
            value={playerName}
            maxLength={30}
            autoComplete="name"
            onChange={(event) => setPlayerName(event.target.value)}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Preparando partida…' : 'Iniciar partida'}
          </button>
        </form>
        {error ? (
          <ErrorBanner
            message={error}
            canRetry={canRetry}
            onDismiss={onDismissError}
            onRetry={() => { void retry(); }}
          />
        ) : null}
      </section>

      <section className="instructions" aria-labelledby="instructions-title">
        <p className="eyebrow">Carta de navegación</p>
        <h2 id="instructions-title">Cómo jugar</h2>
        <ol>
          <li><strong>Objetivo.</strong> Termina con más monedas que el rival.</li>
          <li><strong>Movimiento.</strong> Usa tus dos puntos de acción para avanzar a casillas adyacentes.</li>
          <li><strong>Carga.</strong> Recoge pescado, especias o perlas en su puerto de abastecimiento.</li>
          <li><strong>Venta.</strong> Lleva la mercancía a un mercado y véndela al precio de la marea.</li>
          <li><strong>Mareas.</strong> Cada ronda altera rutas de arrecife, precios y oportunidades.</li>
          <li><strong>Duración.</strong> La partida concluye después de 10 rondas.</li>
          <li><strong>Empate.</strong> Si ambos reúnen las mismas monedas, el resultado es empate.</li>
          <li><strong>Acciones inválidas.</strong> No consumen puntos ni cambian el estado oficial.</li>
        </ol>
      </section>
    </main>
  );
}

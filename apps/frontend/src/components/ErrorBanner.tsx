type ErrorBannerProps = Readonly<{
  message: string;
  canRetry: boolean;
  onDismiss(): void;
  onRetry(): void;
}>;

export default function ErrorBanner({ message, canRetry, onDismiss, onRetry }: ErrorBannerProps) {
  return (
    <div className="error-banner" role="alert">
      <div>
        <strong>{canRetry ? 'Problema con el servidor' : 'No se pudo completar'}</strong>
        <p>{message}</p>
      </div>
      {canRetry
        ? <button type="button" onClick={onRetry}>Reintentar</button>
        : <button type="button" onClick={onDismiss} aria-label="Cerrar mensaje">Cerrar</button>}
    </div>
  );
}

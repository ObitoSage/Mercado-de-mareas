import type { GameEvent } from '@mercado/shared';

export default function EventLog({ events }: Readonly<{ events: readonly GameEvent[] }>) {
  const recentEvents = events.slice(-10).reverse();
  return (
    <ol className="event-log" aria-live="polite">
      {recentEvents.map((event, index) => (
        <li key={`${event.round}-${event.type}-${events.length - index}`}>
          <span>R{event.round}</span>
          {event.message}
        </li>
      ))}
    </ol>
  );
}

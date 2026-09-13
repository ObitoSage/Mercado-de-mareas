export type ActorId = 'PLAYER' | 'AI';
export type GamePhase = 'PLAYER_TURN' | 'RESOLVING_AI' | 'FINISHED';
export type Tide = 'LOW' | 'RISING' | 'HIGH' | 'FALLING';
export type Good = 'FISH' | 'SPICE' | 'PEARL';
export type TileKind = 'SEA' | 'ISLAND' | 'REEF' | 'SUPPLY_PORT' | 'MARKET_PORT';
export type Position = Readonly<{ row: number; column: number }>;
export type GameAction =
  | Readonly<{ type: 'MOVE'; payload: Position }>
  | Readonly<{ type: 'LOAD' }>
  | Readonly<{ type: 'SELL'; payload: { good: Good } }>
  | Readonly<{ type: 'END_TURN' }>;

export const GAME_RULES = Object.freeze({
  boardSize: 7,
  maxRounds: 10,
  actionsPerTurn: 2,
  cargoCapacity: 3,
});

export type PlayerState = Readonly<{
  id: ActorId;
  kind: 'HUMAN' | 'BOT';
  name: string;
  position: Position;
  coins: number;
  cargo: readonly Good[];
  cargoCapacity: number;
}>;

export type Tile = Readonly<{
  position: Position;
  kind: TileKind;
  supplyGood?: Good;
}>;

export type SupplyState = Readonly<{
  position: Position;
  good: Good;
  stock: number;
}>;

export type PriceState = Readonly<Record<Good, number>>;
export type DemandState = Readonly<Record<Good, number>>;

export type GameResult = Readonly<{
  kind: 'PLAYER_WIN' | 'AI_WIN' | 'DRAW';
  playerCoins: number;
  aiCoins: number;
}>;

export type GameEvent =
  | Readonly<{ type: 'GAME_STARTED'; round: number; message: string }>
  | Readonly<{ type: 'MOVED'; round: number; actor: ActorId; from: Position; to: Position; message: string }>
  | Readonly<{ type: 'LOADED'; round: number; actor: ActorId; good: Good; message: string }>
  | Readonly<{ type: 'SOLD'; round: number; actor: ActorId; good: Good; coins: number; message: string }>
  | Readonly<{ type: 'TURN_ENDED'; round: number; actor: ActorId; message: string }>
  | Readonly<{ type: 'TIDE_CHANGED'; round: number; tide: Tide; message: string }>
  | Readonly<{ type: 'RESTOCKED'; round: number; good: Good; position: Position; message: string }>
  | Readonly<{ type: 'ACTION_REJECTED'; round: number; actor: ActorId; code: string; message: string }>
  | Readonly<{ type: 'GAME_FINISHED'; round: number; result: GameResult; message: string }>;

export type GameState = Readonly<{
  id: string;
  seed: number;
  board: readonly Tile[];
  round: number;
  tide: Tide;
  phase: GamePhase;
  activeActor: ActorId;
  actionPoints: number;
  players: Readonly<Record<ActorId, PlayerState>>;
  supplies: readonly SupplyState[];
  prices: PriceState;
  demand: DemandState;
  result: GameResult | null;
  eventLog: readonly GameEvent[];
}>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function isGameAction(value: unknown): value is GameAction {
  if (!isObject(value)) return false;

  switch (value.type) {
    case 'MOVE':
      return hasExactKeys(value, ['type', 'payload'])
        && isObject(value.payload)
        && hasExactKeys(value.payload, ['row', 'column'])
        && Number.isInteger(value.payload.row)
        && Number.isInteger(value.payload.column);
    case 'SELL':
      return hasExactKeys(value, ['type', 'payload'])
        && isObject(value.payload)
        && hasExactKeys(value.payload, ['good'])
        && (value.payload.good === 'FISH' || value.payload.good === 'SPICE' || value.payload.good === 'PEARL');
    case 'LOAD':
    case 'END_TURN':
      return hasExactKeys(value, ['type']);
    default:
      return false;
  }
}

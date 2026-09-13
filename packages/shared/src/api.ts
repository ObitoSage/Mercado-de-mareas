import type { GameEvent, GameState } from './game.js';

export type ApiError = Readonly<{ code: string; message: string }>;
export type CreateGameRequest = Readonly<{ playerName?: string; seed?: number }>;
export type GameResponse = Readonly<{ game: GameState }>;
export type ActionResponse = Readonly<{ game: GameState; newEvents: readonly GameEvent[] }>;
export type ErrorResponse = Readonly<{ error: ApiError; game?: GameState }>;

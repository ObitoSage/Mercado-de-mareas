export type RuleErrorCode =
  | 'GAME_FINISHED'
  | 'NOT_ACTIVE_ACTOR'
  | 'NO_ACTION_POINTS'
  | 'OUT_OF_BOUNDS'
  | 'NOT_ADJACENT'
  | 'TILE_BLOCKED'
  | 'REEF_CLOSED'
  | 'TILE_OCCUPIED'
  | 'NOT_AT_SUPPLY_PORT'
  | 'SUPPLY_EMPTY'
  | 'CARGO_FULL'
  | 'NOT_AT_MARKET'
  | 'GOOD_NOT_IN_CARGO';

const RULE_ERROR_MESSAGES: Readonly<Record<RuleErrorCode, string>> = {
  GAME_FINISHED: 'La partida ya terminó.',
  NOT_ACTIVE_ACTOR: 'No es el turno de ese participante.',
  NO_ACTION_POINTS: 'No quedan puntos de acción.',
  OUT_OF_BOUNDS: 'No puedes avanzar fuera del tablero.',
  NOT_ADJACENT: 'Solo puedes avanzar una casilla en dirección ortogonal.',
  TILE_BLOCKED: 'No puedes avanzar a una isla.',
  REEF_CLOSED: 'No puedes entrar al arrecife fuera de la marea alta.',
  TILE_OCCUPIED: 'No puedes avanzar: el rival ocupa esa casilla.',
  NOT_AT_SUPPLY_PORT: 'Debes estar en un puerto de abastecimiento para cargar.',
  SUPPLY_EMPTY: 'El puerto de abastecimiento está vacío.',
  CARGO_FULL: 'La bodega está llena.',
  NOT_AT_MARKET: 'Debes estar en un puerto de mercado para vender.',
  GOOD_NOT_IN_CARGO: 'No tienes esa mercancía en la bodega.',
};

export function ruleError(code: RuleErrorCode): Readonly<{ code: RuleErrorCode; message: string }> {
  return { code, message: RULE_ERROR_MESSAGES[code] };
}

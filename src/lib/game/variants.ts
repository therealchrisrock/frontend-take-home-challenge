export type BoardVariant =
  | "american"
  | "brazilian"
  | "international"
  | "canadian";

export const BOARD_VARIANTS = [
  "american",
  "brazilian",
  "international",
  "canadian",
] as const;

export function getBoardVariants(): BoardVariant[] {
  return [...BOARD_VARIANTS];
}

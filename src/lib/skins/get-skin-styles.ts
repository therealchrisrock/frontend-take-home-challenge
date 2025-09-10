import { skins } from "./definitions";

export function getSkinStyles(skinId: string): string {
  const skin = skins[skinId] ?? skins["the-og"];
  if (!skin) return "";

  // Generate CSS custom properties as a string
  return `
    --board-light-from: ${skin.board.lightSquare.from};
    --board-light-to: ${skin.board.lightSquare.to};
    --board-dark-from: ${skin.board.darkSquare.from};
    --board-dark-to: ${skin.board.darkSquare.to};
    --board-border: ${skin.board.border};
    --board-selected-ring: ${skin.board.selectedRing};
    --board-highlighted-ring: ${skin.board.highlightedRing};
    --board-possible-move: ${skin.board.possibleMove};
    --board-possible-move-glow: ${skin.board.possibleMoveGlow};
    --board-arrow-stroke: ${skin.board.arrow.stroke};
    --board-arrow-fill: ${skin.board.arrow.fill};
    --board-arrow-glow: ${skin.board.arrow.glow};
    --piece-red-base: ${skin.pieces.red.base};
    --piece-red-from: ${skin.pieces.red.gradient.from};
    --piece-red-to: ${skin.pieces.red.gradient.to};
    --piece-red-border: ${skin.pieces.red.border};
    --piece-red-crown: ${skin.pieces.red.crown};
    --piece-black-base: ${skin.pieces.black.base};
    --piece-black-from: ${skin.pieces.black.gradient.from};
    --piece-black-to: ${skin.pieces.black.gradient.to};
    --piece-black-border: ${skin.pieces.black.border};
    --piece-black-crown: ${skin.pieces.black.crown};
  `;
}

export function getSkinStyleTag(skinId: string): string {
  const styles = getSkinStyles(skinId);
  if (!styles) return "";

  // Return a style tag that sets CSS variables on :root
  return `<style id="skin-styles">:root {${styles}}</style>`;
}

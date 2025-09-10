export function getBoardGridStyleFromSize(size: number): React.CSSProperties {
  return {
    '--board-size': size.toString(),
    gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`
  } as React.CSSProperties;
}


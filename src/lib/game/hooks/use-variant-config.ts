import { useMemo } from "react";
import { GameConfigLoader } from "~/lib/game-engine/config-loader";
import type { BoardVariant } from "~/lib/variants";

export function useVariantConfig(variant: BoardVariant) {
  const result = useMemo(() => {
    try {
      const resolved = GameConfigLoader.loadVariant(variant);
      return { resolved, loading: false, error: null };
    } catch (e) {
      return {
        resolved: null,
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [variant]);

  return result;
}

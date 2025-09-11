## Frontend Reorganization Plan

Goal: Align repository with `project-structure` and `route-colocation` rules while minimizing breaking changes.

### Checklist

- [x] Keep `/auth` directly under `app/auth` (no route group)
- [x] Scaffold private folders under `(checkers)`: `_components`, `_lib`
- [ ] Audit usage of global UI (chat, social, header, sidebar)
- [x] Colocate `profile` and `history` components under their routes
- [x] Move `game` components into `(checkers)/_components/game`
- [ ] Move `features/game` hooks/state to `lib/game`
- [ ] Update imports for moved files; add barrels where helpful
- [ ] Build/test verification; resolve import errors

### Principles

- Colocate by feature within route groups. Use private folders for shared-in-group code.
- Keep truly shared logic in `src/lib` or `src/components/ui` only.
- Preserve public URLs; avoid user-facing route changes.

### Execution Notes

- Perform moves with `git mv` to preserve history.
- Update imports in the same commit as the move when possible.
- Keep changes incremental and verifiable per checklist item.

# Take-Home Challenge: Checkers Game

## Overview

Build a **ReactJS** (or **TypeScript React**) application that implements a playable Checkers game in the browser. Your goal is to demonstrate clean component design, effective state management, and a pleasant user experience. You should structure your app as if shipping to production, with clear documentation and a basic test suite to validate core behavior.

> **Note:** It’s fine if you can’t complete every feature—focus on the essentials first, and document any trade‑offs or unfinished work.

---

## Requirements

### 1. Core Game Mechanics
- **Board & Pieces**  
  - Render an 8×8 checkers board with alternating light/dark squares.  
  - Place 12 red and 12 black pieces on their standard starting positions.
- **Turns & Moves**  
  - Enforce alternating turns between players.  
  - Allow pieces to move diagonally forward one square when unblocked.  
  - Highlight valid move targets when the user hovers over or selects a piece.
- **Captures & Jumps**  
  - If an opponent’s piece is adjacent and the landing square beyond is empty, enforce a mandatory jump over it.  
  - Support multiple sequential jumps in a single turn.
- **Kinging**  
  - When a piece reaches the opponent’s back row, crown it as a “King.”  
  - Kings may move and jump both forward and backward.

### 2. User Interaction
- **Drag‑and‑Drop**  
  - Enable players to drag pieces to their destination square.  
  - Provide keyboard or click‑to‑select alternatives if desired.
- **Visual Feedback**  
  - Highlight all legal destination squares on hover or select.  
  - Display an indicator for the active player’s turn.
- **No‑Brain AI**  
  - Implement a simple AI opponent that picks a random valid move when it’s its turn.  
  - Allow human vs. human and human vs. AI modes.

### 3. Stability & Compatibility
- Ensure the app runs correctly in the latest versions of **Chrome**, **Firefox**, and **Safari**.
- Handle window resizes gracefully (responsive layout).

---

## Additional Considerations

### State Management
- You may use React’s built‑in state/hooks, Context API, Redux, Zustand, or any other library.  
- Structure your state so that game logic (valid moves, captures, kinging) is testable in isolation from UI components.

### Code Quality & Documentation
- Write idiomatic, modular React code with clear component boundaries (e.g. `Board`, `Square`, `Piece`, `GameController`).  
- Include concise docstrings or comments explaining non‑obvious logic.  
- Provide a **README.md** (this file) with:
  - Project description  
  - Installation and running instructions  
  - Testing instructions  
  - Design notes or trade-offs  

### Testing
- Include a basic test suite (using **Jest**, **React Testing Library**, or similar) covering:
  - Move validation logic  
  - Capture sequences  
  - Kinging behavior  
- Bonus: End‑to‑end tests (e.g. **Cypress**) that exercise dragging and dropping.

### Deployment
- Provide a **Dockerfile**, or simply document `npm install && npm start`.  
- (Optional) Host a live demo on Netlify, Vercel, GitHub Pages, etc., and include the URL.

---

## Suggested Ways to Stand Out

- **TypeScript** for full static typing.  
- **Game stats UI**: track time elapsed, move count, captures, and display a summary panel.  
- **Improved AI**: implement a basic minimax algorithm or heuristic move ranking.  
- **Theming**: allow users to switch checker/board color schemes.  
- **Animations**: add smooth transitions for moves and captures.  
- **Undo/Redo**: support stepping backward and forward through move history.

---

## Evaluation Criteria

- **Functionality**: Does the game enforce all Checkers rules correctly?  
- **User Experience**: Is drag‑and‑drop smooth? Are valid moves clearly indicated?  
- **Code Organization**: Are components and state layers well separated?  
- **Readability & Maintainability**: Are functions and modules logically named and documented?  
- **Testing**: Is core logic covered by tests? Do they pass reliably?  
- **Bonus Features**: Any extra polish or enhancements beyond the basic spec.

---

## Deliverables

1. **Source Code**  
   - React project (JavaScript or TypeScript) with clear folder structure.  
   - `package.json` and any build/configuration files.

2. **Documentation**  
   - **README.md** with:
     - Setup and run instructions  
     - Testing instructions  
     - Design notes and trade‑offs

3. **Tests**  
   - Unit tests for game logic.  
   - (Optional) Integration or E2E tests.

4. **Demo**  
   - A running instance (local instructions or hosted URL).

Good luck—have fun building your Checkers game!

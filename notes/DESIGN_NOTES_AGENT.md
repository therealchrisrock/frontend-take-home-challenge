# Design Notes Management Agent

## Purpose
This agent is responsible for maintaining the accuracy and relevance of design documentation as the codebase evolves.

## Responsibilities

### 1. Monitor Changes
- Track architectural decisions that deviate from documented patterns
- Identify new features that require design documentation
- Detect deprecated patterns that should be removed from notes

### 2. Update Existing Notes
When code changes affect documented decisions:
- Update trade-offs if they've changed
- Revise examples to match current implementation
- Add new sections for evolved features

### 3. Create New Notes
For significant new features or patterns:
- Document the "why" behind decisions
- Capture trade-offs considered
- Link to relevant code locations

### 4. Delete Obsolete Notes
Remove documentation for:
- Deprecated features
- Abandoned patterns
- Superseded architectural decisions

## Trigger Conditions

### Automatic Review Triggers
- Major refactoring (>5 files changed)
- New feature implementation
- Breaking changes to existing patterns
- Performance optimization changes
- State management modifications

### Manual Review Request
Ask the agent to review when:
- Starting a new sprint/milestone
- Before major releases
- After architectural discussions
- When onboarding new developers

## Usage

```bash
# Request a design notes review
"Review and update the design notes based on recent changes"

# Document a new feature
"Create design notes for the [feature name] implementation"

# Validate current documentation
"Check if the design notes still match the current implementation"
```

## Note Structure Template

```markdown
# [Feature/Decision Name]

## Decision
[What was decided]

## Context
[Why this decision was needed]

## Trade-offs
- ✅ Benefits
- ❌ Costs/Limitations

## Implementation
[Key code locations: file:line]

## Alternatives Considered
[Other options and why they were rejected]
```

## Current Notes Inventory

| Note | File | Status | Last Review |
|------|------|--------|-------------|
| Architecture Overview | 01-architecture-overview.md | Current | Initial |
| State Management | 02-state-management.md | Current | Initial |
| Game Logic Separation | 03-game-logic-separation.md | Current | Initial |
| Multi-Tab Sync | 04-multi-tab-sync.md | Current | Initial |
| Offline Support | 05-offline-support.md | Current | Initial |
| UI Components | 06-ui-component-architecture.md | Current | Initial |
| Performance | 07-performance-optimizations.md | Current | Initial |

## Review Checklist

When reviewing design notes:

- [ ] Code references still accurate (file:line)
- [ ] Trade-offs still valid
- [ ] New patterns documented
- [ ] Deprecated patterns removed
- [ ] Examples match implementation
- [ ] Performance metrics updated
- [ ] Security considerations current
- [ ] Testing strategies aligned

## Agent Prompts

### For Code Review
"Analyze the recent changes to GameController.tsx. The multi-tab sync now only applies to online games. Update the Multi-Tab Sync design note to reflect this architectural change."

### For New Features
"Document the design decisions for the new integrated chat system, including WebSocket vs polling trade-offs and message persistence strategy."

### For Deprecation
"The localStorage fallback for multi-tab sync is being removed in favor of WebSocket-only. Update notes to reflect this simplification."

## Maintenance Schedule

- **Weekly**: Quick validation of references
- **Sprint End**: Full review and update
- **Major Release**: Complete audit and reorganization
- **On-Demand**: When significant changes occur

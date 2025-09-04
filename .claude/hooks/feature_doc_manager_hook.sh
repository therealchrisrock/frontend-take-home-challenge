#!/bin/bash
# Simple Claude Code Hook for Ticket Assignment Only
# Lets the feature-doc-manager agent handle all documentation logic
# Save as: .claude/hooks/ticket_assignment_hook.sh

PROJECT_ROOT="$(pwd)"
HOOK_CONFIG="$PROJECT_ROOT/.claude/config/ticket-assignment.json"

# Simple logging
log() {
    echo "[TICKET-HOOK] $1" >&2
}

# Load minimal configuration
load_config() {
    if [ ! -f "$HOOK_CONFIG" ]; then
        # Minimal fallback if no config file
        echo '{"enabled": true, "ticket_format": "TICKET-{:03d}", "docs_location": "."}'
        return
    fi
    
    if command -v jq >/dev/null 2>&1; then
        cat "$HOOK_CONFIG"
    else
        # Fallback without jq
        echo '{"enabled": true, "ticket_format": "TICKET-{:03d}", "docs_location": "."}'
    fi
}

# Check if this should trigger ticket assignment
should_assign_ticket() {
    local prompt="$1"
    
    # Simple checks - does this mention the feature-doc-manager agent?
    if echo "$prompt" | grep -qi "feature-doc-manager\|@feature-doc-manager"; then
        return 0
    fi
    
    # Or does it look like a documentation request?
    if echo "$prompt" | grep -qi "document.*feature\|create.*documentation\|spec.*out"; then
        return 0  
    fi
    
    return 1
}

# Get next ticket number
get_next_ticket() {
    local config=$(load_config)
    local docs_location="."
    
    if command -v jq >/dev/null 2>&1; then
        docs_location=$(echo "$config" | jq -r '.docs_location // "."')
    fi
    
    local scan_dir="$PROJECT_ROOT/$docs_location"
    local highest=0
    
    # Find highest TICKET-XXX number in markdown files
    for file in "$scan_dir"/*.md; do
        [ -f "$file" ] || continue
        local numbers=$(grep -oE 'TICKET-[0-9]+' "$file" 2>/dev/null | grep -oE '[0-9]+' | sort -n | tail -1)
        [ -n "$numbers" ] && [ "$numbers" -gt "$highest" ] && highest=$numbers
    done
    
    echo $((highest + 1))
}

# Format ticket number
format_ticket() {
    printf "TICKET-%03d" "$1"
}

# Main hook logic
main() {
    local original_prompt=$(cat)
    local config=$(load_config)
    
    # Check if enabled
    if command -v jq >/dev/null 2>&1; then
        local enabled=$(echo "$config" | jq -r '.enabled // true')
        [ "$enabled" != "true" ] && { echo "$original_prompt"; exit 0; }
    fi
    
    # Should we assign a ticket?
    if should_assign_ticket "$original_prompt"; then
        local next_ticket=$(get_next_ticket)
        local ticket_id=$(format_ticket $next_ticket)
        
        log "Assigning ticket: $ticket_id"
        
        # Simple prompt enhancement - just add the ticket context
        cat << EOF
**ASSIGNED TICKET: $ticket_id**

$original_prompt

---
*Note: This request has been assigned ticket $ticket_id for tracking purposes. Please reference this ticket in any documentation or commits.*
EOF
    else
        # Pass through unchanged
        echo "$original_prompt"
    fi
}

main "$@"